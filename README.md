# Suiknit API Server

一个基于 Node.js、Express 和 TypeScript 构建的现代化后端 API 服务器，集成了 MongoDB 数据库、JWT 认证、Redis 缓存和队列处理系统。

## 功能特性

- **RESTful API**: 遵循 REST 设计原则的 API 接口
- **TypeScript**: 使用 TypeScript 提供类型安全和更好的开发体验
- **MongoDB 集成**: 通过 Mongoose ODM 连接 MongoDB 数据库
- **JWT 认证**: 基于 JSON Web Token 的用户认证机制
- **Redis 缓存和队列**: 使用 Redis 进行数据缓存和数据库操作队列处理
- **自定义日志系统**: 带有敏感数据过滤功能的日志记录
- **环境配置**: 通过 .env.config 文件进行环境配置管理
- **API 版本控制**: 支持多版本 API 管理
- **路径别名**: 使用路径别名简化模块导入
- **邮箱验证码**: 支持邮箱验证的用户注册和登录
- **请求频率限制**: 基于 Redis 的请求频率限制和 IP 黑名单机制
- **MongoDB 自动备份**: 支持定时自动备份 MongoDB 数据库
- **Swagger API 文档**: 自动生成并托管 API 文档

## 技术栈

- [Node.js](https://nodejs.org/) - JavaScript 运行时环境
- [Express.js](https://expressjs.com/) - Web 应用框架
- [TypeScript](https://www.typescriptlang.org/) - JavaScript 的超集，添加了静态类型
- [MongoDB](https://www.mongodb.com/) - NoSQL 数据库
- [Mongoose](https://mongoosejs.com/) - MongoDB 对象建模工具
- [Redis](https://redis.io/) - 内存数据结构存储
- [JSON Web Token](https://jwt.io/) - 用于安全令牌传输的开放标准
- [Nodemailer](https://nodemailer.com/) - Node.js 邮件发送模块
- [svg-captcha](https://github.com/stevenliu216/svg-captcha) - SVG 验证码生成器

## 项目结构

```
suiknit/
├── server.ts              # 应用入口文件
├── config/                # 配置文件目录
│   ├── dbConfig.ts        # 数据库配置
│   ├── logConfig.ts       # 日志配置
│   ├── redisConfig.ts     # Redis 配置
│   └── swaggerConfig.ts   # Swagger 配置
├── controllers/           # 控制器目录
│   ├── v1/                # v1 版本控制器
│   │   ├── authController.ts  # 认证相关控制器
│   │   ├── fileController.ts  # 文件相关控制器
│   │   └── indexController.ts # 主要控制器
│   └── v2/                # v2 版本控制器
│       ├── authController.ts  # 认证相关控制器
│       ├── fileController.ts  # 文件相关控制器
│       └── indexController.ts # 主要控制器
├── models/                # 数据库模型目录
│   └── User.ts            # 用户模型
├── routes/                # 路由目录
│   ├── v1/                # v1 版本路由
│   │   ├── auth.ts        # 认证相关路由
│   │   ├── fileRouter.ts  # 文件相关路由
│   │   ├── index.ts       # 主要路由
│   │   └── main.ts        # v1 路由聚合
│   ├── v2/                # v2 版本路由
│   │   ├── auth.ts        # 认证相关路由
│   │   ├── fileRouter.ts  # 文件相关路由
│   │   ├── index.ts       # v2 路由聚合
│   │   ├── main.ts        # 主要路由
│   └── index.ts           # 路由入口文件
├── services/              # 业务逻辑服务目录
│   └── authService.ts     # 认证相关业务逻辑
├── middleware/            # 中间件目录
│   ├── common.ts          # 通用中间件
│   ├── blacklist.ts       # 黑名单和频率限制中间件
│   ├── errorHandler.ts     # 错误处理中间件
│   └── responseFormatter.ts # 响应格式化中间件
├── validators/            # 验证器目录
│   └── authValidator.ts   # 认证相关验证器
├── exceptions/            # 自定义异常目录
│   └── AppError.ts        # 自定义异常类
├── utility/               # 工具函数目录
│   ├── jwt.ts             # JWT 相关工具函数
│   ├── logger.ts          # 日志工具函数
│   ├── mongoDB.ts         # MongoDB 数据库封装
│   ├── mongoBackup.ts     # MongoDB 备份工具
│   ├── mongoRestore.ts    # MongoDB 恢复工具
│   ├── email.ts           # 邮件发送工具类
│   ├── redisCache.ts      # Redis 缓存工具类
│   └── redisQueue.ts      # Redis 队列处理工具类
├── .env.config            # 环境配置文件
├── package.json           # 项目依赖和脚本
└── tsconfig.json          # TypeScript 配置
```

## 快速开始

### 环境要求

- Node.js >= 14.x
- MongoDB >= 4.x
- Redis >= 5.x

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制 `.env.config` 文件并根据需要修改配置：

```bash
# 服务配置
PORT = 3000
SERVER = 0.0.0.0
LAN = true

# 日志配置
ISLOG = true
LOGPATH = ./logs

# jwt 相关配置
JWENCRPTION = your_secret_key
JWT_EXPIRES_IN = 30d

# 密码配置
BCRYPT_SALT_ROUNDS = 12

# 数据库配置
DB_HOST = localhost
DB_PORT = 27017
DB_NAME = testdb
DB_USERNAME =
DB_PASSWORD =

# 是否启用数据库连接
DB_ENABLED = true

# 验证码配置
CAPTCHA_SIZE = 4
CAPTCHA_WIDTH = 120
CAPTCHA_HEIGHT = 40
CAPTCHA_EXPIRE = 300

# 邮箱验证码配置
EMAIL_CODE_EXPIRE = 300
EMAIL_CODE_LIMIT = 60

# 是否启用邮件服务
EMAIL_ENABLED = true

# 请求频率限制配置
RATE_LIMIT_MAX_REQUESTS = 100
RATE_LIMIT_WINDOW_MS = 60000
RATE_LIMIT_BLACKLIST_DURATION = 3600

# 是否启用请求速率控制
RATE_LIMIT_ENABLED = true

# IP黑名单存储配置
BLACKLIST_STORAGE_PATH = ./blacklist

# Redis配置
REDIS_HOST = localhost
REDIS_PORT = 6379
REDIS_PASSWORD =

# 是否启用Redis
REDIS_ENABLED = true

# 邮件配置
# Gmail示例配置 (需要开启"安全性较低的应用访问权限"或使用应用专用密码)
# EMAIL_HOST = smtp.gmail.com
# EMAIL_PORT = 587
# EMAIL_SECURE = false
# EMAIL_USER = your_email@gmail.com
# EMAIL_PASS = your_email_password
# EMAIL_FROM = your_email@gmail.com

# QQ邮箱示例配置
 EMAIL_HOST = smtp.qq.com
 EMAIL_PORT = 465
 EMAIL_SECURE = true
 EMAIL_USER = 3220145931@qq.com
 EMAIL_PASS = zypwefcvxckodfbg
 EMAIL_FROM = 3220145931@qq.com

# 163邮箱示例配置
# EMAIL_HOST = smtp.163.com
# EMAIL_PORT = 465
# EMAIL_SECURE = true
# EMAIL_USER = your_email@163.com
# EMAIL_PASS = your_163_auth_code
# EMAIL_FROM = your_email@163.com

# MongoDB 备份配置
MONGO_BACKUP_ENABLED = false  # 是否启用 MongoDB 备份功能
MONGO_BACKUP_PATH = ./backups
MONGO_BACKUP_SCHEDULE = 0 2 * * *  # 每天凌晨2点执行备份
MONGO_BACKUP_RETENTION_DAYS = 7  # 保留7天的备份
```

### 开发模式运行

```bash
npm run dev
```

### 生产环境构建

```bash
npm run build
```

### 生产环境运行

```bash
npm run start
```

### 代码质量检查

```bash
# 检查 TypeScript 类型问题
npm run type-check

# 检查 ESLint 问题
npm run lint

# 自动修复 ESLint 可修复的问题
npm run lint:fix
```

## API 接口

### v1 版本接口

#### 认证接口

- `GET /v1/auth/captcha` - 获取图像验证码
- `POST /v1/auth/sendEmailCode` - 发送邮箱验证码
- `POST /v1/auth/register` - 用户注册
- `POST /v1/auth/login` - 用户登录
- `GET /v1/auth/loginByToken` - 使用 Token 验证身份
- `GET /v1/auth/logout` - 用户注销
- `PUT /v1/auth/updateUserInfo` - 更新用户信息

#### 主要接口

- `GET /v1/` - 返回当前日期
- `POST /v1/` - 返回请求详细信息

#### 文件接口

- `GET /v1/file/public` - 公共资源访问

### v2 版本接口

#### 认证接口

- `GET /v2/auth/captcha` - 获取图像验证码 (v2)
- `POST /v2/auth/register` - 用户注册 (v2)
- `POST /v2/auth/login` - 用户登录 (v2)

#### 主要接口

- `GET /v2/` - 返回当前日期 (v2)
- `POST /v2/` - 返回请求详细信息 (v2)

#### 文件接口

- `GET /v2/file/public` - 公共资源访问 (v2)

### 默认版本接口

- `GET /api/` - 返回当前日期 (指向 v1 版本)
- `POST /api/` - 返回请求详细信息 (指向 v1 版本)

## 数据库操作

项目包含一个功能完整的 MongoDB 封装类 (`mgDB`)，提供以下功能：

- 数据库连接管理
- 增删改查 (CRUD) 操作
- 聚合管道查询
- 索引管理
- 事务支持
- 集合管理
- 数据库级别操作
- Redis 缓存支持（查询操作自动缓存）
- Redis 队列处理（写操作先入队列）

## Redis 缓存和队列系统

项目现在使用 Redis 实现了两个重要功能来减轻数据库压力：

### Redis 缓存
- 自动缓存所有查询操作的结果
- 提供缓存数据的获取、存储和删除功能
- 减少对数据库的直接查询，提高响应速度

### Redis 队列
- 所有数据库写操作（插入、更新、删除）都先加入 Redis 队列
- 异步处理数据库操作，提高系统响应性
- 实现操作重试机制和失败处理
- 有效缓解数据库压力

## Redis 缓存和队列系统

项目现在使用 Redis 实现了两个重要功能来减轻数据库压力：

### Redis 缓存
- 自动缓存所有查询操作的结果
- 提供缓存数据的获取、存储和删除功能
- 减少对数据库的直接查询，提高响应速度

### Redis 队列
- 所有数据库写操作（插入、更新、删除）都先加入 Redis 队列
- 异步处理数据库操作，提高系统响应性
- 实现操作重试机制和失败处理
- 有效缓解数据库压力

## 认证系统

使用 JWT 进行用户认证：

- `generateJWT`: 生成新的 JWT token
- `verifyJWT`: 验证 JWT token 的有效性

### 注册流程

1. 用户请求图像验证码（GET /auth/captcha）
2. 用户请求发送邮箱验证码（POST /auth/sendEmailCode）
3. 系统发送验证码到用户邮箱
4. 用户使用邮箱、密码、姓名、图像验证码和邮箱验证码进行注册（POST /auth/register）

### 登录流程

支持两种登录方式：

1. **密码登录**：
   - 用户请求图像验证码（GET /auth/captcha）
   - 用户使用邮箱、密码和图像验证码登录（POST /auth/login）

2. **邮箱验证码登录**：
   - 用户请求发送登录邮箱验证码（POST /auth/sendEmailCode，type=login）
   - 用户使用邮箱和邮箱验证码登录（POST /auth/login）

### 密码安全

- 使用 bcryptjs 对密码进行哈希处理
- 支持通过环境变量配置 bcrypt salt rounds（BCRYPT_SALT_ROUNDS）

## 请求频率限制和IP黑名单

项目包含基于Redis的请求频率限制和IP黑名单功能：

- 限制每个IP在指定时间窗口内的请求次数
- 超过限制的IP将被自动拉黑
- 黑名单IP将被拒绝访问所有接口

### 配置项

- `RATE_LIMIT_MAX_REQUESTS`: 每个时间窗口内允许的最大请求数 (默认: 100)
- `RATE_LIMIT_WINDOW_MS`: 时间窗口大小，单位毫秒 (默认: 60000，即1分钟)
- `RATE_LIMIT_BLACKLIST_DURATION`: IP黑名单持续时间，单位秒 (默认: 3600，即1小时)

## 日志系统

自定义日志系统具有以下特性：

- 按日期分割日志文件
- 敏感数据过滤 (密码、token 等)
- 路径排除功能 (健康检查、静态文件等)
- 请求/响应日志记录及耗时统计

## 请求频率限制和IP黑名单

项目包含基于Redis的请求频率限制和IP黑名单功能：

- 限制每个IP在指定时间窗口内的请求次数
- 超过限制的IP将被自动拉黑
- 黑名单IP将被拒绝访问所有接口

### 配置项

- `RATE_LIMIT_MAX_REQUESTS`: 每个时间窗口内允许的最大请求数 (默认: 100)
- `RATE_LIMIT_WINDOW_MS`: 时间窗口大小，单位毫秒 (默认: 60000，即1分钟)
- `RATE_LIMIT_BLACKLIST_DURATION`: IP黑名单持续时间，单位秒 (默认: 3600，即1小时)

## MongoDB 备份功能

项目包含自动 MongoDB 备份功能，使用 node-cron 实现定时备份：

- 服务启动时自动执行一次备份
- 定时备份 MongoDB 数据库
- 自动压缩备份文件为 .gz 格式
- 自动清理过期备份文件
- 可配置备份路径、定时计划和保留天数

### 配置项

- `MONGO_BACKUP_ENABLED`: 是否启用 MongoDB 备份功能 (默认: true)
- `MONGO_BACKUP_PATH`: 备份文件存储路径 (默认: ./backups)
- `MONGO_BACKUP_SCHEDULE`: 备份定时计划，使用 cron 表达式 (默认: "0 2 * * *" 每天凌晨2点)
- `MONGO_BACKUP_RETENTION_DAYS`: 备份文件保留天数 (默认: 7天)

### 手动执行备份

```typescript
import { manualMongoBackup } from './utility/mongoBackup.js';

// 手动执行一次备份
await manualMongoBackup();
```

### 恢复备份

项目还提供了从备份文件恢复数据库的功能：

```bash
# 列出所有可用的备份文件并显示恢复命令
npm run restore

# 从指定备份文件恢复数据库
npm run restore mongodb-testdb-2025-09-17T02-03-49-601Z
```

您也可以在代码中直接调用恢复功能：

```typescript
import { performMongoRestore } from './utility/mongoRestore.js';

// 从指定备份文件恢复数据库
await performMongoRestore('mongodb-testdb-2025-09-17T02-03-49-601Z');
```

## 邮件服务

项目包含一个功能完整的邮件发送工具类 (`emailService`)，提供以下功能：

- 支持多种收件人格式：
  - 单个邮箱地址
  - 邮箱地址数组（群发相同内容）
  - 对象格式 {email: content}（个性化内容）
  - 对象数组格式 [{email: '', content: ''}]（个性化内容）
- 支持文本和HTML格式邮件
- 完善的错误处理和日志记录
- 基于 nodemailer 实现，支持各种邮件服务商

### 使用示例

```typescript
import { emailService } from './utility/email.js';

// 发送单个邮件
await emailService.send('user@example.com', '邮件主题', '邮件内容');

// 发送多个邮件（相同内容）
await emailService.send(['user1@example.com', 'user2@example.com'], '邮件主题', '邮件内容');

// 发送多个邮件（不同内容）
await emailService.send({
  'user1@example.com': '用户1的内容',
  'user2@example.com': '用户2的内容'
}, '邮件主题', '');

// 发送HTML邮件
await emailService.sendHtml('user@example.com', 'HTML邮件', '<h1>HTML内容</h1>');
```

## 开发规范

1. 使用 TypeScript 严格模式进行开发
2. 遵循模块化设计，分离控制器、路由和工具函数
3. 在所有控制器中实现完整的错误处理
4. 使用环境变量进行配置管理
5. 通过自定义 MongoDB 封装类进行数据库操作
6. 所有数据库操作都必须通过 Redis 缓存和队列系统处理，以减轻数据库压力
7. MongoDB 数据库会根据配置自动进行定时备份，确保数据安全（可通过 MONGO_BACKUP_ENABLED 配置项启用或禁用）
8. 服务启动时会自动执行一次 MongoDB 备份（如果启用了备份功能）
9. 使用 ESLint 进行代码质量检查，确保代码风格一致性
10. 遵循 API 版本控制规范，新功能应在新版本中实现
11. 使用路径别名简化模块导入，提高代码可读性
12. **版本开发规范**：
    - 不直接修改线上稳定版本，避免因为一个小改动导致整个服务不可用
    - 复制一份最新的稳定 API，命名为 `xxx_dev` 或者带版本号（如 v2），在新的副本上进行开发和测试
    - 确认稳定后，再用新版本替换旧的，或者升级路由指向新版本

## 代码质量检查

项目集成了 ESLint 来确保代码质量和风格一致性：

```bash
# 检查 TypeScript 类型和 ESLint 问题
npm run type-check
npm run lint

# 自动修复 ESLint 可修复的问题
npm run lint:fix
```

## API 版本控制

本项目实现了基于URL路径的API版本控制机制，允许在不影响现有客户端的情况下开发和部署新功能。

### 版本控制策略

1. **URL路径版本控制**：通过URL路径区分不同版本的API
   - v1版本：`/v1/auth/login`、`/v1/file/public` 等
   - v2版本：`/v2/auth/login`、`/v2/file/public` 等

2. **向后兼容**：保留现有的v1 API，确保现有客户端不受影响

3. **可扩展性**：可以轻松添加新的API版本（v3、v4等）

### 目录结构

- `routes/v1/` - v1版本的路由文件
- `routes/v2/` - v2版本的路由文件
- `controllers/v1/` - v1版本的控制器文件
- `controllers/v2/` - v2版本的控制器文件

### 使用方法

- 访问v1版本API：`http://localhost:3000/v1/auth/login`
- 访问v2版本API：`http://localhost:3000/v2/auth/login`
- 查看API文档：`http://localhost:3000/api-docs`

### 开发流程规范

为了确保服务的稳定性和可靠性，我们遵循以下开发流程规范：

1. **不直接修改线上稳定版本**：避免因为一个小改动导致整个服务不可用。

2. **创建开发副本**：
   - 复制一份最新的稳定 API 实现
   - 命名为 `xxx_dev` 或者创建新的版本号（如 v2）
   - 在新的副本上进行开发和测试

3. **版本升级流程**：
   - 在开发环境中充分测试新功能
   - 确认稳定后，再用新版本替换旧的版本，或者升级路由指向新版本
   - 通过 `/api` 路由可以控制默认指向的API版本

### 示例开发流程

1. 假设需要修改用户注册功能
2. 复制 `routes/v1/auth.ts` 和 `controllers/v1/authController.ts` 到 `routes/v2/auth.ts` 和 `controllers/v2/authController.ts`
3. 在v2版本中实现新的注册功能
4. 测试v2版本的注册功能
5. 确认稳定后，可以选择：
   - 将默认API路由从v1切换到v2
   - 或者逐步迁移客户端到v2版本

## 路径别名

为了简化模块导入和提高代码可读性，项目配置了路径别名：

- `@/*` - 项目根目录
- `@controllers/*` - controllers目录
- `@routes/*` - routes目录
- `@config/*` - config目录
- `@models/*` - models目录
- `@utility/*` - utility目录
- `@services/*` - services目录
- `@middleware/*` - middleware目录
- `@exceptions/*` - exceptions目录

### 使用示例

```typescript
// 使用路径别名导入模块
import DB from '@/utility/mongoDB.js';
import { generateJWT } from '@/utility/jwt.js';
import User from '@/models/User.js';
```

## 文件依赖关系

项目中的主要文件依赖关系如下：

```
server.ts
├── config/dbConfig.ts
├── config/redisConfig.ts
├── routes/index.ts
│   ├── routes/v1/main.ts
│   │   ├── routes/v1/auth.ts
│   │   │   ├── controllers/v1/authController.ts
│   │   │   │   ├── services/authService.ts
│   │   │   │   │   ├── models/User.ts
│   │   │   │   │   ├── utility/jwt.ts
│   │   │   │   │   ├── config/redisConfig.ts
│   │   │   │   │   ├── utility/email.ts
│   │   │   │   │   ├── utility/redisQueue.ts
│   │   │   │   │   ├── validators/authValidator.ts
│   │   │   │   │   └── exceptions/AppError.ts
│   │   ├── routes/v1/fileRouter.ts
│   │   │   ├── controllers/v1/fileController.ts
│   │   ├── routes/v1/index.ts
│   │   │   ├── controllers/v1/indexController.ts
│   ├── routes/v2/index.ts
│   │   ├── routes/v2/auth.ts
│   │   │   ├── controllers/v2/authController.ts
│   │   ├── routes/v2/fileRouter.ts
│   │   │   ├── controllers/v2/fileController.ts
│   │   ├── routes/v2/main.ts
│   │   │   ├── controllers/v2/indexController.ts
├── utility/mongoDB.ts
├── utility/redisQueue.ts
│   ├── config/redisConfig.ts
│   ├── utility/redisCache.ts
├── utility/mongoBackup.ts
│   ├── config/dbConfig.ts
├── middleware/common.ts
├── middleware/errorHandler.ts
├── middleware/blacklist.ts
│   ├── config/redisConfig.ts
├── middleware/responseFormatter.ts
└── utility/logger.ts
```

