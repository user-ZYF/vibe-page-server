import { Router } from 'express';
import {
  createController,
  deleteController,
  detailController,
  listController,
  updateController,
} from '../controllers/page.js';
import { authRequired } from '../middleware/auth.js';

/** 画布页面接口路由 */
export const pageRouter = Router();

// 校验 token
pageRouter.use(authRequired);

pageRouter.get('/', listController);
pageRouter.post('/', createController);
pageRouter.get('/detail', detailController);
pageRouter.put('/', updateController);
pageRouter.delete('/', deleteController);
