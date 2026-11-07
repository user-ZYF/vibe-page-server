import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../db.js';

/**
 * 刷新令牌表（表名 refresh_token）
 * 只有 created_at，没有 updated_at
 */
export class RefreshToken extends Model<
  InferAttributes<RefreshToken>,
  InferCreationAttributes<RefreshToken>
> {
  /** 主键 */
  declare id: CreationOptional<number>;
  /** 用户 ID */
  declare userId: number;
  /** 令牌（UUID 随机串，去掉横线） */
  declare token: string;
  /** 签发时绑定的会话 ID，刷新时必须与用户当前 session_id 一致 */
  declare sessionId: CreationOptional<string>;
  /** 过期时间（毫秒时间戳） */
  declare expiresAt: number;
  /** 手动作废标记：0 有效，1 已作废 */
  declare revoked: CreationOptional<number>;
  /** 创建时间（毫秒时间戳） */
  declare createdAt: CreationOptional<number>;
}

RefreshToken.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT, allowNull: false },
    token: { type: DataTypes.STRING(64), allowNull: false },
    sessionId: { type: DataTypes.STRING(64), allowNull: false, defaultValue: '' },
    expiresAt: { type: DataTypes.BIGINT, allowNull: false },
    revoked: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    createdAt: DataTypes.BIGINT,
  },
  {
    sequelize,
    tableName: 'refresh_token',
    timestamps: false,
    hooks: {
      beforeCreate: (record) => {
        record.createdAt = Date.now();
      },
    },
  },
);
