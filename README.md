# Suiknit API Server

一个基于 Node.js、Express 和 TypeScript 构建的现代化后端 API 服务器，集成了 MongoDB 数据库、JWT 认证和自定义日志系统。

## 功能特性

- **RESTful API**: 遵循 REST 设计原则的 API 接口
- **TypeScript**: 使用 TypeScript 提供类型安全和更好的开发体验
- **MongoDB 集成**: 通过 Mongoose ODM 连接 MongoDB 数据库
- **JWT 认证**: 基于 JSON Web Token 的用户认证机制
- **自定义日志系统**: 带有敏感数据过滤功能的日志记录
- **环境配置**: 通过 .env.config 文件进行环境配置管理

## 技术栈

- [Node.js](https://nodejs.org/) - JavaScript 运行时环境
- [Express.js](https://expressjs.com/) - Web 应用框架
- [TypeScript](https://www.typescriptlang.org/) - JavaScript 的超集，添加了静态类型
- [MongoDB](https://www.mongodb.com/) - NoSQL 数据库
- [Mongoose](https://mongoosejs.com/) - MongoDB 对象建模工具
- [JSON Web Token](https://jwt.io/) - 用于安全令牌传输的开放标准

## 项目结构

```
suiknit/
├── server.ts              # 应用入口文件
├── config/                # 配置文件目录
│   ├── dbConfig.ts        # 数据库配置
│   └── logConfig.ts       # 日志配置
├── controllers/           # 控制器目录
│   ├── authController.ts  # 认证相关控制器
│   ├── fileController.ts  # 文件相关控制器
│   └── indexController.ts # 主要控制器
├── routes/                # 路由目录
│   ├── auth.ts            # 认证相关路由
│   ├── fileRouter.ts      # 文件相关路由
│   └── index.ts           # 主要路由
├── utility/               # 工具函数目录
│   ├── jwt.ts             # JWT 相关工具函数
│   ├── logger.ts          # 日志工具函数
│   └── mongoDB.ts         # MongoDB 数据库封装
├── .env.config            # 环境配置文件
├── package.json           # 项目依赖和脚本
└── tsconfig.json          # TypeScript 配置
```

## 快速开始

### 环境要求

- Node.js >= 14.x
- MongoDB >= 4.x

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

# 数据库配置
DB_HOST = localhost
DB_PORT = 27017
DB_NAME = testdb
DB_USERNAME =
DB_PASSWORD =
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

## API 接口

### 认证接口

- `POST /auth/login` - 用户登录
- `GET /auth/loginByToken` - 使用 Token 验证身份

### 主要接口

- `GET /` - 返回当前日期
- `POST /` - 返回请求详细信息

### 文件接口

- `GET /file/public` - 公共资源访问

## 数据库操作

项目包含一个功能完整的 MongoDB 封装类 (`mgDB`)，提供以下功能：

- 数据库连接管理
- 增删改查 (CRUD) 操作
- 聚合管道查询
- 索引管理
- 事务支持
- 集合管理
- 数据库级别操作

## 认证系统

使用 JWT 进行用户认证：

- `generateJWT`: 生成新的 JWT token
- `verifyJWT`: 验证 JWT token 的有效性

## 日志系统

自定义日志系统具有以下特性：

- 按日期分割日志文件
- 敏感数据过滤 (密码、token 等)
- 路径排除功能 (健康检查、静态文件等)
- 请求/响应日志记录及耗时统计

## 开发规范

1. 使用 TypeScript 严格模式进行开发
2. 遵循模块化设计，分离控制器、路由和工具函数
3. 在所有控制器中实现完整的错误处理
4. 使用环境变量进行配置管理
5. 通过自定义 MongoDB 封装类进行数据库操作

## License

MIT