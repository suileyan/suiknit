# Suiknit API Server

一个基于 Node.js、Express 5 和 TypeScript 构建的现代化后端服务。提供用户认证与授权、文件上传/下载、管理员接口、统一响应格式、集中式路由访问控制、Redis 队列与频控、日志/安全中间件、Swagger 文档等。

## 功能总览

- 服务基础
  - TypeScript + 路径别名（见 `tsconfig.json`）
  - 统一响应格式中间件（`ok/status/message/body/timestamp/time-consuming`）
  - 错误处理与 404 处理
  - Swagger UI + 自动生成 JSON（`/api-docs`）
- 鉴权与权限
  - JWT 登录/注册、邮箱验证码、图形验证码
  - 统一鉴权工具（`utility/auth.ts`）：提取 Token、校验/解码、获取当前用户
  - 集中式路由访问控制（`config/routeAccessRules.ts` + `middleware/routeAccessControl.ts`）
  - 角色等级：`moderator > admin > user`，支持最小权限与“高改低、同级不可改”策略
- 文件能力
  - 单文件/多文件上传，分片上传（init/chunk/merge）
  - 下载令牌生成（Redis 限频），支持 Range/断点
  - 文件、权限模型（`models/File.ts`, `models/FilePermission.ts`）
- 管理端（ADMIN+）
  - 用户列表/详情/增删改，权限严格校验
  - 文件列表/更新/删除（逻辑删除）
- 可观测与安全
  - 请求日志（敏感字段过滤）、请求 ID、限流+黑名单
  - 安全头（helmet）、压缩（compression）、输入净化（sanitizer）
  - MongoDB 备份任务、Redis 队列

## 目录结构

```
suiknit/
├── server.ts                     # 应用入口（中间件栈、路由、Swagger 生成）
├── config/
│   ├── dbConfig.ts               # 数据库连接串配置
│   ├── corsConfig.ts             # CORS 配置
│   ├── redisConfig.ts            # Redis 客户端初始化
│   ├── swaggerConfig.ts          # Swagger 规范加载
│   └── routeAccessRules.ts       # 路由访问控制规则（集中配置）
├── controllers/
│   └── dev/                      # 开发版本接口
│       ├── authController.ts     # 登录、注册、验证码
│       ├── userController.ts     # 个人资料/头像
│       ├── fileController.ts     # 上传/分片上传/公共资源
│       ├── fileDownloadController.ts # 下载令牌与下载
│       ├── adminController.ts    # 管理端用户/文件接口
│       └── indexController.ts    # 示例与基础接口
├── routes/
│   └── dev/
│       ├── auth.ts               # /dev/auth/*
│       ├── fileRouter.ts         # /dev/file/* 上传相关
│       ├── fileDownloadRouter.ts # /dev/file/download/* 下载相关
│       ├── admin.ts              # /dev/admin/* 管理端
│       └── index.ts              # dev 路由聚合
├── middleware/
│   ├── common.ts                 # CORS/请求日志/请求体验证
│   ├── errorHandler.ts           # 错误与 404 处理
│   ├── blacklist.ts              # 频控与黑名单
│   ├── responseFormatter.ts      # 统一响应包装（深度去套娃）
│   ├── requestId.ts              # X-Request-Id 透传/生成
│   ├── security.ts               # helmet/compression
│   ├── sanitizer.ts              # 输入净化（防 XSS/控制字符）
│   └── routeAccessControl.ts     # 集中式路由访问控制
├── models/
│   ├── User.ts                   # 用户与角色
│   ├── File.ts                   # 文件元数据
│   └── FilePermission.ts         # 文件访问权限
├── services/
│   └── authService.ts            # 登录/注册/用户资料更新/验证码发送
├── utility/
│   ├── auth.ts                   # 鉴权工具（获取 Token/当前用户/角色比较）
│   ├── jwt.ts                    # JWT 生成/校验
│   ├── logger.ts                 # 结构化日志与敏感字段过滤
│   ├── mongoDB.ts                # Mongo 客户端封装
│   ├── mongoBackup.ts            # Mongo 备份定时任务
│   ├── email.ts                  # 邮件发送
│   └── redisQueue.ts             # Redis 队列（异步 DB 操作）
├── resource/
│   ├── logs/                     # 访问日志
│   ├── swagger/                  # 运行时导出的 swagger.json
│   ├── uploads/                  # 上传文件根目录（可配置）
│   └── backups/                  # Mongo 备份归档
├── example/
│   └── index.html                # 测试控制台（本地静态页面）
└── test/                         # 手动/脚本测试（可选）
```

## 启动与脚本

- 开发：`npm run dev`（tsc watch + tsc-alias watch + nodemon 运行 dist/server.js）
- 构建：`npm run build`（输出至 `dist/`）
- 生产：`npm run start`（运行 `dist/server.js`）
- 类型：`npm run type-check`（`tsc --noEmit`）
- 规范：`npm run lint` / `npm run lint:fix`

## 环境变量（.env.config）

- 进程与基础
  - `PORT`（默认 4000）、`LAN`（是否绑定外网）、`SERVER`（监听地址）
  - `SWAGGER_PATH`（Swagger JSON 输出目录，默认 `./resource/swagger`）
  - `ISLOG`（是否记录访问日志）、`LOGPATH`（日志目录）
  - `JSON_LIMIT`（请求体大小限制，默认 1mb）
- JWT/验证码/邮箱
  - `JWENCRPTION`（仅密钥，建议保留在 .env）
  - 图形验证码、邮箱验证码、邮箱发送等在 TS 配置中管理（详见“配置管理”和 CONFIG.md）
- Mongo/Redis
  - `DB_HOST/DB_PORT/DB_NAME/DB_USERNAME/DB_PASSWORD`（或连接串）
  - `REDIS_HOST/REDIS_PORT/REDIS_PASSWORD`
- 频控与黑名单
  - `RATE_LIMIT_ENABLED`、`RATE_LIMIT_MAX_REQUESTS`、`RATE_LIMIT_WINDOW_MS`、`RATE_LIMIT_BLACKLIST_DURATION`
- 上传/分片
  - TS 配置文件：`config/uploadConfig.ts`
- 下载令牌
  - TS 配置文件：`config/downloadConfig.ts`

## 配置管理

- .env.config 仅包含“服务器运行”强相关项（端口、日志路径、JWT 密钥、DB/Redis 等）。
- 业务可调项在 `config/` 目录的 TS 配置文件中管理，改动后配合 `npm run dev` 或重启服务生效。

- 配置清单（TS）：
  - 图形验证码：`config/captchaConfig.ts`
  - 邮箱验证码：`config/authCodeConfig.ts`
  - 邮件发送：`config/emailConfig.ts`
  - 上传/分片：`config/uploadConfig.ts`
  - 下载令牌：`config/downloadConfig.ts`

- 示例：调整上传大小与目录（`config/uploadConfig.ts`）
```ts
const uploadConfig = {
  uploadDir: './resource/uploads',
  maxFileSize: 20 * 1024 * 1024, // 20MB
  allowedTypes: ['image/*','text/*','application/pdf'],
  enableChunkedUpload: true,
  chunkDir: './resource/chunks',
  chunkMaxSize: 100 * 1024 * 1024 // 100MB
};
export default uploadConfig;
```

> 说明：不要将真实密钥提交到仓库，示例仅供参考。

## 中间件栈（关键顺序）

- `cors` → `requestLogger` → `requestId` → `securityHeaders()` → `compressionMiddleware`
- `express.json/urlencoded`（带 `JSON_LIMIT`）→ `sanitizeInput` → `validateRequest`
- `unifiedResponseMiddleware`（统一响应包装）
- `loggingMiddleware`（按需记录日志与耗时）
- `rateLimitAndBlacklistMiddleware`（频控与黑名单）
- `routeAccessControl`（集中路由鉴权，未匹配默认放行）
- `routes`（版本化 dev 路由）
- `notFoundHandler` → `errorHandler`

## 统一响应规范

- 成功/失败均包装为：
  - `{ ok: boolean, status: number, message: string, body: any, timestamp: string, 'time-consuming': number }`
- 中间件会自动“去套娃”：若控制器返回 `{code,message,data}` 或已经是 `{ok,status,body}`，会被归一至单层包装；最终 `body` 内不再出现 `ok/status/message/body` 等元字段。

## 路由与权限

- 公共（示例）
  - `GET /dev/auth/captcha` 获取图形验证码
  - `POST /dev/auth/sendEmailCode` 发送邮箱验证码
  - `POST /dev/auth/register` 注册
  - `POST /dev/auth/login` 登录（密码+图形验证码 / 邮箱验证码）
  - `GET /dev/auth/loginByToken` Token 刷新
  - `GET /dev/file/public?fileId=...` 查询公共文件信息
- 需 USER 及以上
  - `PUT /dev/auth/updateUserInfo` 更新个人信息
  - `GET /dev/auth/avatar` 获取本人头像；`GET /dev/auth/avatar/:userId` 获取指定用户头像
  - 上传：`/dev/file/upload/single|multiple|init|chunk|merge`
  - 下载令牌：`POST /dev/file/download/token`
- 需 ADMIN 及以上（管理端）
  - 用户：`GET/POST/PATCH/DELETE /dev/admin/users`、`GET /dev/admin/users/:id`
  - 文件：`GET /dev/admin/files`、`PATCH/DELETE /dev/admin/files/:id`
- 集中式规则：见 `config/routeAccessRules.ts`（未匹配默认放行）。

## API 文档（Dev 路由）

统一说明
- 鉴权：除公开接口外，其它接口需在请求头携带 `Authorization: Bearer <JWT>`。
- 响应：统一包装为 `{ ok, status, message, body, timestamp, 'time-consuming' }`，以下示例仅写 `body` 内部结构。
- 频控与黑名单：见“中间件栈”，默认开启；日志查询等管理接口需要 ADMIN 及以上权限。

认证与验证码（公开）
- GET `/dev/auth/captcha`
  - 说明：获取图形验证码
  - 返回 body：`{ captchaId: string, captchaImage: data:image/svg+xml;base64,... }`
- POST `/dev/auth/sendEmailCode`
  - Body：`{ email: string, type: 'register' | 'login' }`
  - 返回 body：`null`
- POST `/dev/auth/register`
  - Body：`{ email, password, name, captchaId, captchaCode, emailCode }`
  - 返回 body：`{ token, user: { id, email, name } }`
- POST `/dev/auth/login`
  - 二选一：
    - 密码登录：`{ email, password, captchaId, captchaCode }`
    - 邮箱验证码登录：`{ email, emailCode }`
  - 返回 body：`{ token, user: { id, email, name } }`
- GET `/dev/auth/loginByToken`
  - 头：`Authorization: Bearer <JWT>` 或 `token: <JWT>`
  - 返回 body：`{ token, user: { id, email, name } }`

用户资料
- PUT `/dev/auth/updateUserInfo`（USER+）
  - Body：`{ name?: string, avatarPath?: string }`
  - 返回 body：更新后的用户概要
- GET `/dev/auth/avatar`（USER+）
  - 返回：头像二进制流（`image/*`/`image/svg+xml`）
- GET `/dev/auth/avatar/:userId`
  - 返回：指定用户头像二进制流

文件（上传/公共信息）
- GET `/dev/file/public?fileId=...`
  - 返回 body：`{ id, name, path, size, type, extension, createdAt }`
- POST `/dev/file/upload/single`（USER+，`multipart/form-data`）
  - 字段：`file`（单文件），可含 `description`, `isPublic`
  - 返回 body：文件概要
- POST `/dev/file/upload/multiple`（USER+，`multipart/form-data`）
  - 字段：`files[]`（多文件），可含 `description`, `isPublic`
  - 返回 body：文件列表
- 分片上传（USER+）
  - POST `/dev/file/upload/chunk/init` Body：`{ fileName, fileSize, chunkCount }`
  - POST `/dev/file/upload/chunk` `multipart/form-data`：`{ chunk, uploadId, chunkIndex }`
  - POST `/dev/file/upload/chunk/merge` Body：`{ uploadId, fileName, fileSize, chunkCount }`

文件下载（令牌）
- POST `/dev/file/download/token`（USER+）
  - Body：`{ fileId }`
  - 返回 body：`{ downloadUrl: string }`
- GET `/dev/file/download/:fileId?key=<token>`
  - 返回：附件流，支持 Range 断点

管理端（ADMIN+）
- 用户管理
  - GET `/dev/admin/users?role=&page=&pageSize=`
  - GET `/dev/admin/users/:id`
  - POST `/dev/admin/users` Body：`{ email, name, password, role }`
  - PATCH `/dev/admin/users/:id` Body：`{ email?, name?, password?, role? }`（字段级策略过滤）
  - DELETE `/dev/admin/users/:id`
- 文件管理
  - GET `/dev/admin/files?status=&page=&pageSize=`
  - PATCH `/dev/admin/files/:id` Body：`{ name?, description?, tags?, status? }`（字段级策略过滤）
  - DELETE `/dev/admin/files/:id`
- 日志查询
  - GET `/dev/admin/logs/files`：列出可用 `.log` 文件
  - GET `/dev/admin/logs?file=&date=&tail=&method=&path=&status=&keyword=`：查询日志尾部

示例与调试
- GET `/dev/`：服务器时间
- POST `/dev/`：回显请求（body/query/headers 等）

## 上传/下载要点

- 上传：支持单文件、多文件、分片（init → chunk → merge）；按扩展名分类落盘，校验 `MAX_FILE_SIZE/ALLOWED_FILE_TYPES`。
- 下载：生成短期 JWT 令牌写入 Redis（限频），下载接口支持 HTTP Range，设置合适的响应头（附件/长度/分块）。

## 模型与业务

- `models/User.ts`：邮箱、哈希密码、角色（user/admin/moderator）、头像路径、最后登录
- `models/File.ts`：文件名、相对路径、大小、类型、扩展名、校验和、状态（active/archived/deleted）、标签
- `models/FilePermission.ts`：按文件-用户记录访问权限（下载等）

## 日志与备份

- `utility/logger.ts`：结构化文本日志，过滤敏感字段（password/token/cookie/...），可通过 `ISLOG=true` 开启。
- `utility/mongoBackup.ts`：定时备份（需要在服务入口已启用），备份文件位于 `resource/backups`。

## Swagger 文档

- 打开 `http://localhost:<PORT>/api-docs` 查看 UI。
- 服务器启动时会写出 `resource/swagger/swagger.json`。

### @openapi 注释编写指南

本项目使用 swagger-jsdoc 解析源码中的 `@openapi` 注释（位于 controllers/routes 里），推荐写在路由定义上方或控制器函数上方。基本结构如下：

示例：生成下载令牌（片段）

```ts
/**
 * @openapi
 * /dev/file/download/token:
 *   post:
 *     summary: 生成下载令牌
 *     description: 为指定文件生成临时下载令牌
 *     tags: [下载]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fileId:
 *                 type: string
 *                 example: "file_1726..."
 *             required: [fileId]
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "下载令牌生成成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     downloadUrl:
 *                       type: string
 *                       example: "/dev/file/download/<id>?key=<token>"
 *       401:
 *         description: 未授权
 */
```

常用元素说明
- `tags`: 文档分组
- `security`: 使用全局的 `bearerAuth`（在 swaggerConfig.ts 中定义）
- `parameters`: 查询或路径参数（`in: query|path|header`）
- `requestBody`: 请求体（支持 `application/json`、`multipart/form-data` 等）
- `responses`: 各状态码的返回体描述与示例
- 可在 controllers 与 routes 中混写注释；最终由 swagger-jsdoc 扫描合并。

## 示例测试控制台（example/index.html）

- 打开静态页面，设置 Base URL（默认 http://localhost:4000），粘贴 Token 后可测试受保护接口。
- 已集成“安全检查”按钮，查看关键安全响应头和 `X-Request-Id`。
- 上传/下载/验证码/登录等流程可一键发起并查看统一响应。

## 开发与质量

- 类型检查：`npm run type-check`
- 规范检查：`npm run lint` / `npm run lint:fix`
- 本地开发：`npm run dev`（推荐）

## 安全提示

- 所有密钥、密码仅放在 `.env.config`，切勿提交仓库。
- 生产环境建议开启严格 CSP（需要为 Swagger/控制台设置白名单或拆分为独立域名）。
- 若暴露外网，请结合反向代理（TLS、HSTS）、WAF/ACL、日志采集、主备/监控告警等。

## 规划与扩展建议

- 健康探针与指标：`/healthz`、`/readyz`、`/metrics`（Prometheus）
- 统一请求校验：Zod/Joi + 自动 400/422 错误
- 文件转码/缩略图/杀毒：对接任务队列（BullMQ）与外部服务
- 更完整的审计日志与操作留痕
