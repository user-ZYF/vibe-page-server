import { Router } from 'express';
import multer from 'multer';
import { checkController, chunkController } from '../controllers/file.js';
import { authRequired } from '../middleware/auth.js';

/** 文件上传接口路由（分片续传） */
export const fileRouter = Router();

/** 分片上传解析 */
const chunkUpload = multer({
  // 分片数据在内存中处理
  storage: multer.memoryStorage(),
  // 单个分片不能超过10MB
  limits: { fileSize: 10 * 1024 * 1024 },
  // 解析chunk字段
}).single('chunk');

// 校验 token
fileRouter.use(authRequired);

fileRouter.post('/check', checkController);
fileRouter.post('/chunk', chunkUpload, chunkController);
