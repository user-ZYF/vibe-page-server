import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../db.js';

/**
 * 用户表（表名 user）
 * deleted 为逻辑删除标记：0 正常，1 已删除；
 * defaultScope 让普通查询自动附加 deleted = 0
 */
export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  /** 主键 */
  declare id: CreationOptional<number>;
  /** 用户名 */
  declare username: string;
  /** 密码（BCrypt 哈希） */
  declare password: string;
  /** 昵称 */
  declare nickname: CreationOptional<string>;
  /** 当前会话 ID（单点登录：新登录覆盖，旧会话令牌随之失效） */
  declare sessionId: CreationOptional<string>;
  /** 逻辑删除标记 */
  declare deleted: CreationOptional<number>;
  /** 创建时间（毫秒时间戳） */
  declare createdAt: CreationOptional<number>;
  /** 更新时间（毫秒时间戳） */
  declare updatedAt: CreationOptional<number>;

  /** 序列化为响应对象（剥离密码等敏感字段） */
  override toJSON(): UserInfo {
    const { password: _p, deleted: _d, sessionId: _s, ...data } = this.get({ plain: true });
    return data;
  }
}

User.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    username: { type: DataTypes.STRING(50), allowNull: false },
    password: { type: DataTypes.STRING(100), allowNull: false },
    nickname: { type: DataTypes.STRING(50), allowNull: false, defaultValue: '' },
    sessionId: { type: DataTypes.STRING(64), allowNull: false, defaultValue: '' },
    deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    createdAt: DataTypes.BIGINT,
    updatedAt: DataTypes.BIGINT,
  },
  {
    sequelize,
    tableName: 'user',
    defaultScope: { where: { deleted: 0 } },
    timestamps: false,
    hooks: {
      beforeCreate: (user) => {
        user.createdAt = user.updatedAt = Date.now();
      },
      beforeUpdate: (user) => {
        user.updatedAt = Date.now();
      },
    },
  },
);

/** 用户信息（不含密码、会话 ID、删除标记） */
export type UserInfo = Omit<InferAttributes<User>, 'password' | 'deleted' | 'sessionId'>;

/** 登录/刷新响应 */
export interface LoginResult {
  /** 访问令牌 */
  accessToken: string;
  /** 刷新令牌 */
  refreshToken: string;
  /** 用户信息 */
  userInfo: UserInfo;
}
