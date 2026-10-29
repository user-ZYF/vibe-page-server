import { Router } from 'express';
import {
  loginController,
  logoutController,
  refreshController,
  registerController,
} from '../controllers/auth.js';

/** 认证接口路由 */
export const authRouter = Router();

authRouter.post('/register', registerController);
authRouter.post('/login', loginController);
authRouter.post('/refresh', refreshController);
authRouter.post('/logout', logoutController);
