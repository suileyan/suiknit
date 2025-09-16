// indexController.ts - 处理主页相关请求的控制器
import type { Request, Response } from 'express';

// GET 请求处理函数
export const getIndex = (req: Request, res: Response) => {
  try {
    res.send(`${new Date().toISOString().split('T')[0]}`);
  } catch (error) {
    console.error('处理根路径请求时出错:', error);
    res.status(500).send('服务器内部错误');
  }
};

// POST 请求处理函数
export const postIndex = (req: Request, res: Response) => {
  try {
    // 输入验证
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: '请求体必须是有效的 JSON 对象' });
    }

    res.status(200).json({
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
      ip: req.ip
    });
  } catch (error) {
    console.error('处理 POST 请求时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
};