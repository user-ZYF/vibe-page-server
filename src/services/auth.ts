import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Transaction } from 'sequelize';
import { BizException } from '../common/biz-exception.js';
import { ResultCodeEnum } from '../constants/result-code.js';
import { sequelize } from '../db.js';
import { Page, RefreshToken, User, type LoginResult, type UserInfo } from '../models/index.js';
import type { LoginBody, RegisterBody, TokenAuthResult } from '../types/auth.js';
import { generateToken, parseToken } from '../utils/jwt.js';

/** 新用户默认画布标题 */
const SAMPLE_PAGE_TITLE = '示例画布';

/** 示例画布种子文件路径 */
const SEED_PATH = path.resolve(import.meta.dirname, '../../seed/sample-page.json');

/**
 * 注册
 */
export async function register({ username, password, nickname }: RegisterBody): Promise<UserInfo> {
  const exists = await User.findOne({ where: { username } });
  if (exists) {
    throw new BizException(ResultCodeEnum.BAD_REQUEST, '用户名已被注册');
  }

  const user = await User.create({
    username,
    password: bcrypt.hashSync(password, 10),
    nickname: nickname ?? '',
  });
  await seedSamplePage(user.id);
  return user.toJSON();
}

/**
 * 登录
 */
export async function login({ username, password }: LoginBody): Promise<LoginResult> {
  return sequelize.transaction(async (t) => {
    const user = await User.findOne({ where: { username }, transaction: t });
    if (!user || !bcrypt.compareSync(password, user.password)) {
      throw new BizException(ResultCodeEnum.BAD_REQUEST, '用户名或密码错误');
    }

    // 作废旧会话的全部刷新令牌，并生成新会话 ID 覆盖到用户表
    await RefreshToken.update(
      { revoked: 1 },
      { where: { userId: user.id, revoked: 0 }, transaction: t },
    );
    user.sessionId = randomUUID();
    await user.save({ transaction: t });

    return {
      accessToken: generateToken(user.id, user.username, user.sessionId),
      refreshToken: await issueRefreshToken(user.id, user.sessionId, t),
      userInfo: user.toJSON(),
    };
  });
}

/** 为新用户播种一张示例画布，资源缺失时跳过不影响注册 */
async function seedSamplePage(userId: number): Promise<void> {
  try {
    const content = fs.readFileSync(SEED_PATH, 'utf8');
    await Page.create({ userId, title: SAMPLE_PAGE_TITLE, content });
  } catch (e) {
    console.warn('示例画布资源缺失，跳过播种', e);
  }
}

/**
 * 为指定用户签发刷新令牌
 * @param userId 用户 ID
 * @param sessionId 绑定的会话 ID，仅允许该会话刷新
 * @param transaction 可选事务
 * @param expiresAt 过期时间（毫秒时间戳）
 * @returns 刷新令牌
 */
export async function issueRefreshToken(
  userId: number,
  sessionId: string,
  transaction?: Transaction,
  expiresAt?: number,
): Promise<string> {
  expiresAt ??= Date.now() + Number(process.env.JWT_REFRESH_EXPIRE_DAYS) * 24 * 60 * 60 * 1000;
  const record = await RefreshToken.create(
    {
      userId,
      sessionId,
      token: randomUUID().replaceAll('-', ''),
      expiresAt,
      revoked: 0,
    },
    { transaction },
  );
  return record.token;
}

/**
 * 刷新访问令牌
 * @param token 旧刷新令牌
 * @returns LoginResult
 */
export async function refresh(token: string): Promise<LoginResult> {
  return sequelize.transaction(async (t) => {
    // 行锁锁定旧令牌并校验状态：并发刷新只有一个请求能成功，防止令牌重复使用（导致一个旧Refresh Token生成多个新Refresh Token）
    const oldToken = await RefreshToken.findOne({
      where: { token },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!oldToken || oldToken.revoked !== 0) {
      throw new BizException(ResultCodeEnum.UNAUTHORIZED, '刷新令牌无效或已过期，请重新登录');
    }
    const user = await User.findByPk(oldToken.userId, { transaction: t });
    if (!user) {
      throw new BizException(ResultCodeEnum.UNAUTHORIZED, '用户不存在，请重新登录');
    }
    // 会话一致性：令牌签发时绑定的会话必须仍是当前会话，否则是已被新登录顶替的残留令牌
    if (oldToken.sessionId !== user.sessionId) {
      await oldToken.update({ revoked: 1 }, { transaction: t });
      throw new BizException(ResultCodeEnum.UNAUTHORIZED, '刷新令牌无效或已过期，请重新登录');
    }
    if (oldToken.expiresAt <= Date.now()) {
      // 活跃令牌自然过期说明会话终结，清空 sessionId 让残留访问令牌立即失效
      await User.update(
        { sessionId: '' },
        { where: { id: user.id }, transaction: t },
      );
      throw new BizException(ResultCodeEnum.UNAUTHORIZED, '刷新令牌无效或已过期，请重新登录');
    }
    await oldToken.update({ revoked: 1 }, { transaction: t });

    // 轮换新令牌，减少暴露风险
    const newRefreshToken = await issueRefreshToken(user.id, user.sessionId, t, oldToken.expiresAt);
    return {
      accessToken: generateToken(user.id, user.username, user.sessionId),
      refreshToken: newRefreshToken,
      userInfo: user.toJSON(),
    };
  });
}

/**
 * 登出：作废刷新令牌
 * @param token 刷新令牌
 */
export async function logout(token: string): Promise<void> {
  await sequelize.transaction(async (t) => {
    const record = await RefreshToken.findOne({ where: { token }, transaction: t });
    if (!record) return;
    // 作废刷新令牌
    await RefreshToken.update(
      { revoked: 1 },
      { where: { userId: record.userId, revoked: 0 }, transaction: t },
    );
    // 清空会话 ID
    await User.update(
      { sessionId: '' },
      { where: { id: record.userId }, transaction: t },
    );
  });
}

/**
 * 校验访问令牌并解析出有效用户：JWT 验签 + 用户存在性 + 会话一致性
 * @param token 访问令牌（不含 Bearer 前缀）
 * @returns 校验结果
 */
export async function resolveTokenUser(token: string): Promise<TokenAuthResult> {
  let payload;
  try {
    payload = parseToken(token);
  } catch {
    return { code: ResultCodeEnum.UNAUTHORIZED, user: null };
  }
  const user = await User.findByPk(payload.userId, {
    attributes: ['id', 'username', 'nickname', 'sessionId'],
  });
  if (!user) {
    return { code: ResultCodeEnum.USER_NOT_FOUND, user: null };
  }
  // 比对令牌 sessionId 与 user.session_id，不一致说明会话已被新登录顶替
  if (typeof payload.sessionId !== 'string' || user.sessionId !== payload.sessionId) {
    return { code: ResultCodeEnum.FORCE_OFFLINE, user: null };
  }
  return { code: ResultCodeEnum.SUCCESS, user };
}
