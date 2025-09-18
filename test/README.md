# 文件上传测试示例

这个目录包含了一个独立的文件上传测试环境，使用了 `smt-hash` 库来处理文件分片和哈希计算。

## 目录结构

```
test/
├── fileUpload.html     # 文件上传测试页面
├── server.js           # 测试服务器
├── package.json        # 测试项目的依赖配置
└── README.md           # 本说明文件
```

## 使用方法

1. **安装依赖**：
   ```bash
   cd test
   npm install
   ```

2. **启动测试服务器**：
   ```bash
   npm start
   ```

3. **打开测试页面**：
   在浏览器中访问 `http://localhost:3001/fileUpload.html`

## 功能特点

- 支持单文件和多文件上传
- 支持大文件分片上传
- 使用 `smt-hash` 库计算文件 SHA256 哈希值
- 可配置分片大小（1MB、2MB、5MB、10MB）
- 显示上传进度和状态信息
- 支持取消上传操作

## 技术实现

### 前端
- 使用 `smt-hash` 库计算文件哈希
- 实现文件分片逻辑
- 与后端 API 进行交互

### 后端
- 使用 Express.js 搭建测试服务器
- 使用 Multer 处理文件上传
- 实现分片上传的三个接口：
  1. `/v1/file/upload/chunk/init` - 初始化分片上传
  2. `/v1/file/upload/chunk` - 上传单个分片
  3. `/v1/file/upload/chunk/merge` - 合并所有分片

## 注意事项

- 此测试环境是独立的，不会污染主项目的依赖
- 上传的文件保存在 `test/uploads/` 目录中
- 分片文件临时保存在 `test/chunks/` 目录中，合并完成后会自动清理