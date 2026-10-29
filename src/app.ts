import cors from 'cors';
import express, { type Express } from 'express';
import { errorHandler } from './middleware/error-handler.js';
import { authRouter } from './routes/auth.js';
import { pageRouter } from './routes/page.js';

/** 组装 Express 应用 */
export function createApp(): Express {
  const app = express();

  // 跨域中间键（完全放开）
  app.use(cors({ origin: true, credentials: true }));

  // 画布内容与缩略图（base64）较大，放宽 JSON 体积上限
  app.use(express.json({ limit: '20mb' }));

  // /api/auth 开头的请求进入 authRouter
  app.use('/api/auth', authRouter);
  // /api/pages 开头的请求进入 pageRouter
  app.use('/api/pages', pageRouter);

  // 前面任何环节抛错，都会进入errorHandler
  app.use(errorHandler);
  return app;
}
