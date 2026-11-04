import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../db.js';

/**
 * 画布页面表（表名 page）
 * deleted 为逻辑删除标记：0 正常，1 已删除
 */
export class Page extends Model<InferAttributes<Page>, InferCreationAttributes<Page>> {
  /** 主键 */
  declare id: CreationOptional<number>;
  /** 归属用户 ID */
  declare userId: number;
  /** 页面标题 */
  declare title: string;
  /** 画布内容 */
  declare content: string;
  /** 协作分享令牌（空串表示未开启分享） */
  declare shareToken: CreationOptional<string>;
  /** 逻辑删除标记 */
  declare deleted: CreationOptional<number>;
  /** 创建时间（毫秒时间戳） */
  declare createdAt: CreationOptional<number>;
  /** 更新时间（毫秒时间戳） */
  declare updatedAt: CreationOptional<number>;

  /** 序列化为响应对象（剥离删除标记） */
  override toJSON(): PageInfo {
    const { deleted: _d, ...data } = this.get({ plain: true });
    return data;
  }
}

Page.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT, allowNull: false },
    title: { type: DataTypes.STRING(100), allowNull: false },
    content: { type: DataTypes.TEXT('long'), allowNull: false },
    shareToken: { type: DataTypes.STRING(64), allowNull: false, defaultValue: '' },
    deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    createdAt: DataTypes.BIGINT,
    updatedAt: DataTypes.BIGINT,
  },
  {
    sequelize,
    tableName: 'page',
    defaultScope: { where: { deleted: 0 } },
    timestamps: false,
    hooks: {
      beforeCreate: (page) => {
        page.createdAt = page.updatedAt = Date.now();
      },
      beforeUpdate: (page) => {
        page.updatedAt = Date.now();
      },
    },
  },
);

/** 画布列表项（不含 content，属性级只取这几列） */
export type PageListItem = Pick<
  InferAttributes<Page>,
  'id' | 'title' | 'createdAt' | 'updatedAt'
>;

/** 画布详情（不含删除标记） */
export type PageInfo = Omit<InferAttributes<Page>, 'deleted'>;
