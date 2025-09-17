// 统一错误处理中间件
export const errorHandler = (
  err: any,
  _req: any,
  res: any,
  _next: any
): void => {
  console.error('Error occurred:', err);
  
  // 默认错误信息
  let statusCode = 500;
  let message = 'Internal Server Error';
  
  // 根据错误类型设置不同的响应
  if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400;
    message = 'Invalid JSON format';
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Malformed request';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  }
  
  res.status(statusCode).json({
    code: statusCode,
    message,
    data: null,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// 404 处理中间件
export const notFoundHandler = (
  _req: any,
  res: any,
  _next: any
): void => {
  res.status(404).json({
    code: 404,
    message: `Route ${_req.originalUrl} not found`,
    data: null
  });
};

export default {
  errorHandler,
  notFoundHandler
};