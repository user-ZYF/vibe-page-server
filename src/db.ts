import 'dotenv/config';
import { Sequelize } from 'sequelize';

/**
 * Sequelize 实例（MySQL，驱动为 mysql2）
 * 连接参数取自 .env 中的 DB_* 变量
 */
export const sequelize = new Sequelize(
  process.env.DB_NAME!,
  process.env.DB_USER!,
  process.env.DB_PASSWORD!,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    dialect: 'mysql',
    dialectOptions: {
      // 连接字符集：utf8mb4 支持 emoji 等 4 字节字符
      charset: 'utf8mb4',
    },
    define: {
      // camelCase 属性自动映射 snake_case 列名
      underscored: true,
    },
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  },
);
