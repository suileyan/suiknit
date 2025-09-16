// 日志配置文件
interface LogConfig {
    excludeBodyPaths: string[];
    excludePaths: string[];
    sensitiveFields: string[];
}

export const logConfig: LogConfig = {
    // 不记录 body 的路径
    excludeBodyPaths: [
        '/health',
        '/status',
        '/ping',
        '/metrics'
    ],

    // 完全不记录日志的路径
    excludePaths: [
        '/favicon.ico',
        '/robots.txt'
    ],

    // 敏感字段，不记录在日志中
    sensitiveFields: [
        'password',
        'token',
        'authorization',
        'cookie',
        'session'
    ]
};