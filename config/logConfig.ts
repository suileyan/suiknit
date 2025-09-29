// logConfig.ts
export interface LogConfig {
    excludeBodyPaths: string[];
    excludePaths: string[];
    sensitiveFields: string[];
    placeholder: string;
}

export const logConfig: LogConfig = {
    // 不记录 body 的路径
    excludeBodyPaths: [
        '/health',
        '/status',
        '/ping',
        '/metrics',
        '/auth/captcha'
    ],

    // 完全不记录日志的路径（支持以 * 结尾的前缀匹配）
    excludePaths: [
        '/favicon.ico',
        '/robots.txt',
        '/upload/chunk',
        '/dev/file/upload*'
    ],

    // 敏感字段，不记录在日志中
    sensitiveFields: [
        'password',
        'token',
        'authorization',
        'cookie',
        'session',
        'captcha',
        'captchaimage'
    ],

    // 屏蔽字段占位文字，可自定义
    placeholder: '[已屏蔽]'
};
