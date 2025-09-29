# 配置指南（CONFIG）

本文描述本项目的配置体系（config/ 目录与 `.env.config`），包含各项配置含义、默认值与使用建议。

## 1. 环境变量（.env.config）

- 进程与基础
  - `PORT`：服务端口，默认 `4000`
  - `LAN`：是否监听外网（布尔），默认关闭
  - `SERVER`：监听地址，默认 `0.0.0.0`
  - `SWAGGER_PATH`：Swagger JSON 输出目录，默认 `./resource/swagger`
  - `JSON_LIMIT`：请求体大小限制，默认 `1mb`
  - `ISLOG`：是否启用访问日志，默认 `false`
  - `LOGPATH`：日志目录，默认 `./resource/logs`

- JWT / 验证码 / 邮件
  - `JWENCRPTION`：JWT 密钥（必填）
  - `JWT_EXPIRES_IN`：JWT 过期时间，默认 `30d`
  - `CAPTCHA_SIZE`/`CAPTCHA_WIDTH`/`CAPTCHA_HEIGHT`/`CAPTCHA_EXPIRE`：图形验证码设置
  - `EMAIL_CODE_EXPIRE`：邮箱验证码过期（秒），默认 `300`
  - `EMAIL_CODE_LIMIT`：邮箱验证码频控（秒），默认 `60`
  - `EMAIL_HOST`/`EMAIL_PORT`/`EMAIL_SECURE`/`EMAIL_USER`/`EMAIL_PASS`/`EMAIL_FROM`：邮件配置

- Mongo / Redis
  - `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USERNAME`/`DB_PASSWORD`
  - `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`

- 频控与黑名单
  - `RATE_LIMIT_ENABLED`：启用频控，默认 `false`
  - `RATE_LIMIT_MAX_REQUESTS`：时间窗内允许最大请求数，默认 `100`
  - `RATE_LIMIT_WINDOW_MS`：时间窗（毫秒），默认 `60000`
  - `RATE_LIMIT_BLACKLIST_DURATION`：拉黑持续时间（秒），默认 `3600`

- 上传 / 分片
  - `UPLOAD_DIR`：上传根目录，默认 `./resource/uploads`
  - `MAX_FILE_SIZE`：单文件最大字节数，默认 `10485760`（10MB）
  - `ALLOWED_FILE_TYPES`：逗号分隔的允许类型，如 `image/*,text/*`
  - `ENABLE_CHUNKED_UPLOAD`：是否开启分片上传（布尔）
  - `CHUNK_DIR`：分片缓存目录，默认 `./resource/chunks`
  - `CHUNK_MAX_SIZE`：单个分片最大字节数（Multer 限制），默认 `52428800`（50MB）

- 下载令牌
  - `DOWNLOAD_TOKEN_SECRET`：下载令牌密钥，默认 `download_secret_key`
  - `DOWNLOAD_TOKEN_EXPIRES_IN`：令牌过期时间，默认 `5m`
  - `DOWNLOAD_TOKEN_RATE_LIMIT`：重复获取令牌的冷却（秒），默认 `20`

## 2. config/ 目录

### 2.1 `config/dbConfig.ts`
- 使用 `.env.config` 中 `DB_*` 构建 Mongo 连接串。

### 2.2 `config/redisConfig.ts`
- 从 `.env.config` 中读取 Redis 连接参数，暴露 `redisClient` 与 `connectRedis()`。

### 2.3 `config/corsConfig.ts`
- CORS 配置：
  - `config/cors/allowed_origins.txt`：白名单（每行一个）
  - `config/cors/blocked_origins.txt`：黑名单（每行一个）
  - 代码里可配置 `allowedMethods/allowedHeaders/exposedHeaders/credentials/maxAge`。

### 2.4 `config/swaggerConfig.ts`
- 装配 OpenAPI 规范，启动时写出 `swagger.json` 至 `SWAGGER_PATH` 目录。

### 2.5 `config/routeAccessRules.ts`
- 集中式路由访问控制规则（未匹配的路由默认放行）。
- 规则：`{ method?: 'ALL'|HTTP 方法, path: string|RegExp, minRole: UserRole }`
  - 字符串 path：
    - 完全匹配：`'/dev/ping'`
    - 前缀匹配：以 `*` 结尾，如 `'/dev/admin*'`
  - 正则：如 `/^\/dev\/file\/upload\/(single|multiple|chunk)$/i`

### 2.6 `config/logConfig.ts`
- 日志写入控制：
  - `excludePaths`：完全不写日志的路径（支持 `*` 前缀通配）
    - 示例：`'/dev/file/upload*'` 会排除所有上传路由
  - `excludeBodyPaths`：写日志但隐藏 `query/body`
  - `sensitiveFields`：敏感字段（在 query/body/response 中统一以占位符替换）

### 2.7 `config/emailConfig.ts`
- 邮件发送配置：
  - `host/port/secure`：SMTP 基本信息（465 通常 `secure=true`）
  - `auth.user/auth.pass`：账号与授权码
  - `from`：默认发件人（可不填，默认与 user 相同）

### 2.8 `config/uploadConfig.ts`
- 上传与分片：
  - `uploadDir`：上传根目录
  - `maxFileSize`：单文件最大字节数
  - `allowedTypes`：允许类型（支持 `image/*` 等）
  - `enableChunkedUpload`：是否开启分片
  - `chunkDir`：分片缓存目录
  - `chunkMaxSize`：单个分片最大字节数

### 2.9 `config/captchaConfig.ts`
- 图形验证码：
  - `size/width/height/expire`

### 2.10 `config/authCodeConfig.ts`
- 邮箱验证码：
  - `expire`：过期秒
  - `limit`：频控秒

### 2.11 `config/downloadConfig.ts`
- 下载令牌：
  - `downloadTokenSecret`：令牌签名密钥
  - `downloadTokenExpiresIn`：令牌过期时间（如 `5m`）
  - `tokenRateLimit`：频控（秒）
  - `tokenReuseMode`：令牌复用策略（`range_only`/`single_use`/`multi_use`）

### 2.12 `config/rateLimitConfig.ts` & `config/rate-limit/*`
- 频控配置：
  - 支持通过 `.env.config` 设置全局参数
  - 也可在 `config/rate-limit/excluded_paths.txt` 和 `excluded_methods.txt`
    中配置排除项（文本文件）。

## 3. 日志体系

- 开关：`ISLOG=true` 时启用。
- 存储：每日一个 `.log`，路径 `LOGPATH`（默认 `./resource/logs`）。
- 记录内容：时间、IP、路径、方法、query/body（可能被隐藏）、status、响应摘要、耗时、时间戳。
- 查询：
  - `GET /dev/admin/logs/files` 列出日志文件
  - `GET /dev/admin/logs` 按文件/日期/过滤项查询尾部
  - `example/logs.html` 提供可视化（需要 ADMIN Token）

## 4. 安全与校验

- Helmet 安全头（可按需开启 CSP）、Compression 压缩
- 轻量 Mongo 键清洗 `mongoSanitizeLite`（只处理 `body/params`，不改 `query`）
- 字符串净化（移除 `<script>`/`javascript:`、控制字符）
- 强化建议：为路由接入 Zod/Joi 校验（类型、范围、枚举、白名单）

## 5. 权限与策略

- 路由级最小权限：`config/routeAccessRules.ts` + `middleware/routeAccessControl.ts`
- 资源/字段级策略：`services/policyService.ts`
  - 资源级：`canDownloadFile/canUpdateFile/canDeleteFile/...`
  - 字段级：`filterUserUpdate/filterFileUpdate`（按操作者身份与所有权过滤可改字段）
## 6. 配置清单与建议

- TS 配置（建议集中调整）：
  - 图形验证码：`config/captchaConfig.ts`
  - 邮箱验证码：`config/authCodeConfig.ts`
  - 邮件发送：`config/emailConfig.ts`
  - 上传/分片：`config/uploadConfig.ts`
  - 下载令牌：`config/downloadConfig.ts`

- .env.config（建议仅保留）：
  - 端口/日志：`PORT/SERVER/LAN/ISLOG/LOGPATH/JSON_LIMIT/SWAGGER_PATH`
  - JWT：`JWENCRPTION`、`JWT_EXPIRES_IN`
  - 数据库/Redis：`DB_*`、`REDIS_*`
  - 频控：`RATE_LIMIT_*`、`BLACKLIST_STORAGE_PATH`
  - 备份：`MONGO_BACKUP_*`
