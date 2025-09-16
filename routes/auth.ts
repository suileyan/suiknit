import express, { Router } from "express";
import { login, loginByToken } from "../controllers/authController.ts";

const router: Router = express.Router();

// 登录路由
router.post('/login', login);

// 通过Token登录路由
router.get('/loginByToken', loginByToken);

export default router;