// 自定义应用异常基类
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(
        message: string,
        statusCode: number = 500,
        isOperational: boolean = true
    ) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

// 验证异常
export class ValidationError extends AppError {
    constructor(message: string) {
        super(message, 400);
    }
}

// 认证异常
export class AuthenticationError extends AppError {
    constructor(message: string = '认证失败') {
        super(message, 401);
    }
}

// 授权异常
export class AuthorizationError extends AppError {
    constructor(message: string = '权限不足') {
        super(message, 403);
    }
}

// 资源未找到异常
export class NotFoundError extends AppError {
    constructor(message: string = '资源未找到') {
        super(message, 404);
    }
}

// 请求频率限制异常
export class RateLimitError extends AppError {
    constructor(message: string = '请求过于频繁') {
        super(message, 429);
    }
}