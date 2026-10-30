import { Router } from 'express';
import multer from 'multer';
import { checkController, chunkController } from '../controllers/file.js';
import { authRequired } from '../middleware/auth.js';

/** 文件上传接口路由（分片续传） */
export const fileRouter = Router();

/** 分片上传解析（multipart/form-data，单文件字段 chunk，限制 10MB） */
const chunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('chunk');

// 校验 token
fileRouter.use(authRequired);

fileRouter.post('/check', checkController);
fileRouter.post('/chunk', chunkUpload, chunkController);
