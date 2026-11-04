import 'dotenv/config';
import { createServer } from 'node:http';
import { createApp } from './app.js';
import { sequelize } from './db.js';
import { attachCollabServer } from './ws/index.js';
// 引入 models 确保表结构已注册到 sequelize
import './models/index.js';

/** 启动入口：连接数据库 → 同步表结构 → 启动 HTTP 服务 */
async function main(): Promise<void> {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 表不存在时自动创建（不会修改已存在的表）
    await sequelize.sync();

    const port = Number(process.env.PORT);
    const app = createApp();
    // HTTP 与协作 WebSocket 共用同一端口（/ws 路径升级为长连接）
    const server = createServer(app);
    attachCollabServer(server);
    server.listen(port, () => {
      console.log(`vibepage-server 已启动：http://localhost:${port}`);
    });
  } catch (err) {
    console.error('启动失败', err);
    process.exit(1);
  }
}

main();
