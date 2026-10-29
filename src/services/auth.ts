import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Op, type Transaction } from 'sequelize';
import { BizException } from '../common/biz-exception.js';
import { ResultCodeEnum } from '../constants/result-code.js';
import { sequelize } from '../db.js';
import { Page, RefreshToken, User, type LoginResult, type UserInfo } from '../models/index.js';
import { generateToken } from '../utils/jwt.js';

/** 新用户默认画布标题 */
const SAMPLE_PAGE_TITLE = '示例画布';

/** 示例画布种子文件路径 */
const SEED_PATH = path.resolve(import.meta.dirname, '../../seed/sample-page.json');

/** 注册请求 */
export interface RegisterBody {
  /** 用户名 */
  username: string;
  /** 密码 */
  password: string;
  /** 昵称 */
  nickname?: string;
}

/** 登录请求 */
export interface LoginBody {
  /** 用户名 */
  username: string;
  /** 密码 */
  password: string;
}

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
  const user = await User.findOne({ where: { username } });
  if (!user || !bcrypt.compareSync(password, user.password)) {
    throw new BizException(ResultCodeEnum.BAD_REQUEST, '用户名或密码错误');
  }

  return {
    accessToken: generateToken(user.id, user.username),
    refreshToken: await issueRefreshToken(user.id),
    userInfo: user.toJSON(),
  };
}

/** 为新用户播种一张示例画布，资源缺失时跳过不影响注册 */
async function seedSamplePage(userId: number): Promise<void> {
  try {
    const content = fs.readFileSync(SEED_PATH, 'utf8');
    await Page.create({ userId, title: SAMPLE_PAGE_TITLE, content, thumbnail: '' });
  } catch (e) {
    console.warn('示例画布资源缺失，跳过播种', e);
  }
}

/**
 * 为指定用户签发刷新令牌
 * @param userId 用户 ID
 * @param transaction 可选事务
 * @returns 刷新令牌
 */
export async function issueRefreshToken(userId: number, transaction?: Transaction): Promise<string> {
  const expiresAt = Date.now() + Number(process.env.JWT_REFRESH_EXPIRE_DAYS) * 24 * 60 * 60 * 1000;
  const record = await RefreshToken.create(
    {
      userId,
      token: randomUUID().replaceAll('-', ''),
      expiresAt,
      revoked: 0,
    },
    { transaction },
  );
  return record.token;
}

/**
 * 刷新访问令牌：旧刷新令牌作废并轮换新的
 * @param token 旧刷新令牌
 * @returns LoginResult
 */
export async function refresh(token: string): Promise<LoginResult> {
  return sequelize.transaction(async (t) => {
    // 条件更新作废旧令牌：行锁保证并发下只有一个请求能成功，防止令牌重复使用
    const [updated] = await RefreshToken.update(
      { revoked: 1 },
      {
        where: {
          token,
          revoked: 0,
          expiresAt: { [Op.gt]: Date.now() },
        },
        transaction: t,
      },
    );
    if (updated === 0) {
      throw new BizException(ResultCodeEnum.UNAUTHORIZED, '刷新令牌无效或已过期，请重新登录');
    }

    const { userId } = (await RefreshToken.findOne({ where: { token }, transaction: t }))!;
    const user = await User.findByPk(userId, { transaction: t });
    if (!user) {
      throw new BizException(ResultCodeEnum.UNAUTHORIZED, '用户不存在，请重新登录');
    }

    const newRefreshToken = await issueRefreshToken(user.id, t);
    return {
      accessToken: generateToken(user.id, user.username),
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
  await RefreshToken.update({ revoked: 1 }, { where: { token } });
}
