const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

const app = express();
const PORT = 3001;

// 创建目录
const uploadDir = path.join(__dirname, 'uploads');
const chunkDir = path.join(__dirname, 'chunks');
const tempDir = path.join(__dirname, 'temp');

// 配置multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir)
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.random().toString(36).substring(2, 10) + '-' + file.originalname)
  }
});

const upload = multer({ storage: storage });

// 中间件
app.use(express.json());
app.use(express.static('.'));

// 确保目录存在
async function ensureDir(dir) {
  try {
    await fs.access(dir);
  } catch (error) {
    await fs.mkdir(dir, { recursive: true });
  }
}

// 生成随机用户ID
function generateUserId() {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
}

// 生成随机文件ID
function generateFileId() {
  return 'file_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
}

// 生成验证码
function generateCaptcha() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let captcha = '';
  for (let i = 0; i < 4; i++) {
    captcha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return captcha;
}

// 模拟用户数据存储
const users = new Map();
const captchas = new Map();
const emailCodes = new Map();
const files = new Map();

// 模拟验证码和邮箱验证码功能
function storeCaptcha(captchaId, code) {
  captchas.set(captchaId, {
    code: code.toLowerCase(),
    expires: Date.now() + 5 * 60 * 1000 // 5分钟过期
  });
}

function verifyCaptcha(captchaId, code) {
  const captcha = captchas.get(captchaId);
  if (!captcha) return false;
  if (Date.now() > captcha.expires) {
    captchas.delete(captchaId);
    return false;
  }
  return captcha.code === code.toLowerCase();
}

function storeEmailCode(email, code, type) {
  const key = `${type}_${email}`;
  emailCodes.set(key, {
    code: code,
    expires: Date.now() + 5 * 60 * 1000 // 5分钟过期
  });
}

function verifyEmailCode(email, code, type) {
  const key = `${type}_${email}`;
  const emailCode = emailCodes.get(key);
  if (!emailCode) return false;
  if (Date.now() > emailCode.expires) {
    emailCodes.delete(key);
    return false;
  }
  return emailCode.code === code;
}

// 生成JWT Token (模拟)
function generateToken(user) {
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + 
         Buffer.from(JSON.stringify(user)).toString('base64') + 
         '.' + crypto.randomBytes(32).toString('hex');
}

// 验证Token (模拟)
function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const user = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return user;
  } catch (error) {
    return false;
  }
}

// 中间件：验证Token
function authenticateToken(req, res, next) {
  const token = req.headers['token'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      code: 401,
      message: '未提供认证令牌',
      data: null
    });
  }
  
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({
      code: 401,
      message: '无效的认证令牌',
      data: null
    });
  }
  
  req.user = user;
  next();
}

// 路由：获取验证码
app.get('/v1/auth/captcha', (req, res) => {
  try {
    const captchaCode = generateCaptcha();
    const captchaId = 'captcha_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
    
    storeCaptcha(captchaId, captchaCode);
    
    // 生成简单的SVG验证码图像
    const svg = `
      <svg width="120" height="40" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f0f0f0"/>
        <text x="50%" y="50%" font-family="Arial" font-size="20" fill="#333" text-anchor="middle" dominant-baseline="middle">${captchaCode}</text>
      </svg>
    `;
    
    res.json({
      code: 200,
      message: '验证码生成成功',
      data: {
        captchaId,
        captchaImage: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
      }
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: '验证码生成失败',
      data: null
    });
  }
});

// 路由：发送邮箱验证码
app.post('/v1/auth/sendEmailCode', (req, res) => {
  try {
    const { email, type } = req.body;
    
    if (!email || !type) {
      return res.status(400).json({
        code: 400,
        message: '邮箱和用途类型不能为空',
        data: null
      });
    }
    
    // 生成6位数字验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    storeEmailCode(email, code, type);
    
    console.log(`邮箱验证码已发送到 ${email}: ${code} (类型: ${type})`);
    
    res.json({
      code: 200,
      message: '验证码发送成功',
      data: null
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: '发送验证码失败',
      data: null
    });
  }
});

// 路由：用户注册
app.post('/v1/auth/register', (req, res) => {
  try {
    const { email, password, name, captchaId, captchaCode, emailCode } = req.body;
    
    // 验证参数
    if (!email || !password || !name || !captchaId || !captchaCode || !emailCode) {
      return res.status(400).json({
        code: 400,
        message: '邮箱、密码、姓名、图像验证码ID、图像验证码和邮箱验证码不能为空',
        data: null
      });
    }
    
    // 验证图像验证码
    if (!verifyCaptcha(captchaId, captchaCode)) {
      return res.status(400).json({
        code: 400,
        message: '图像验证码错误或已过期',
        data: null
      });
    }
    
    // 验证邮箱验证码
    if (!verifyEmailCode(email, emailCode, 'register')) {
      return res.status(400).json({
        code: 400,
        message: '邮箱验证码错误或已过期',
        data: null
      });
    }
    
    // 检查用户是否已存在
    for (let [userId, user] of users) {
      if (user.email === email) {
        return res.status(400).json({
          code: 400,
          message: '该邮箱已被注册',
          data: null
        });
      }
    }
    
    // 创建用户
    const userId = generateUserId();
    const user = {
      id: userId,
      email,
      name,
      password // 实际应用中需要加密
    };
    
    users.set(userId, user);
    
    // 生成token
    const token = generateToken(user);
    
    res.status(201).json({
      code: 201,
      message: '注册成功',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: '注册失败',
      data: null
    });
  }
});

// 路由：用户登录
app.post('/v1/auth/login', (req, res) => {
  try {
    const { email, password, emailCode, captchaId, captchaCode } = req.body;
    
    // 验证基本参数
    if (!email) {
      return res.status(400).json({
        code: 400,
        message: '邮箱不能为空',
        data: null
      });
    }
    
    // 确定登录方式
    const isPasswordLogin = !!(password && captchaId && captchaCode);
    const isEmailCodeLogin = !!emailCode;
    
    // 验证登录方式
    if (!isPasswordLogin && !isEmailCodeLogin) {
      return res.status(400).json({
        code: 400,
        message: '请选择登录方式：密码登录需要密码和图像验证码，邮箱验证码登录需要邮箱验证码',
        data: null
      });
    }
    
    let user = null;
    
    // 查找用户
    for (let [userId, existingUser] of users) {
      if (existingUser.email === email) {
        user = existingUser;
        break;
      }
    }
    
    if (!user) {
      return res.status(401).json({
        code: 401,
        message: '用户不存在',
        data: null
      });
    }
    
    // 如果是密码登录，验证密码和图像验证码
    if (isPasswordLogin) {
      if (user.password !== password) { // 实际应用中需要解密验证
        return res.status(401).json({
          code: 401,
          message: '密码错误',
          data: null
        });
      }
      
      if (!verifyCaptcha(captchaId, captchaCode)) {
        return res.status(400).json({
          code: 400,
          message: '图像验证码错误或已过期',
          data: null
        });
      }
    }
    
    // 如果是邮箱验证码登录，验证邮箱验证码
    if (isEmailCodeLogin) {
      if (!verifyEmailCode(email, emailCode, 'login')) {
        return res.status(400).json({
          code: 400,
          message: '邮箱验证码错误或已过期',
          data: null
        });
      }
    }
    
    // 生成token
    const token = generateToken(user);
    
    res.json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: '登录失败',
      data: null
    });
  }
});

// 路由：Token验证
app.get('/v1/auth/loginByToken', authenticateToken, (req, res) => {
  try {
    const token = generateToken(req.user);
    
    res.json({
      code: 200,
      message: 'token验证成功',
      data: {
        token,
        user: req.user
      }
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: '验证失败',
      data: null
    });
  }
});

// 路由：用户注销
app.get('/v1/auth/logout', authenticateToken, (req, res) => {
  try {
    res.json({
      code: 200,
      message: '注销成功',
      data: null
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: '注销失败',
      data: null
    });
  }
});

// 路由：初始化分片上传
app.post('/v1/file/upload/chunk/init', authenticateToken, async (req, res) => {
  try {
    const { fileName, fileSize, chunkCount } = req.body;
    
    // 生成上传ID
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    // 创建分片上传目录
    const chunkUploadDir = path.join(chunkDir, uploadId);
    await ensureDir(chunkUploadDir);
    
    console.log(`初始化分片上传: ${fileName}, 分片数: ${chunkCount}, 上传ID: ${uploadId}`);
    
    res.json({
      code: 200,
      message: '分片上传初始化成功',
      data: {
        uploadId,
        chunkUploadDir
      }
    });
  } catch (error) {
    console.error('初始化分片上传失败:', error);
    res.status(500).json({
      code: 500,
      message: '初始化分片上传失败',
      data: null
    });
  }
});

// 路由：上传分片
app.post('/v1/file/upload/chunk', authenticateToken, upload.single('chunk'), async (req, res) => {
  try {
    const { uploadId, chunkIndex } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        code: 400,
        message: '没有文件被上传',
        data: null
      });
    }
    
    // 保存分片文件
    const chunkFileName = `chunk_${chunkIndex}`;
    const chunkFilePath = path.join(chunkDir, uploadId, chunkFileName);
    
    // 移动文件到目标位置
    await fs.rename(req.file.path, chunkFilePath);
    
    console.log(`分片上传成功: 分片 ${chunkIndex}, 上传ID: ${uploadId}`);
    
    res.json({
      code: 200,
      message: '分片上传成功',
      data: {
        chunkIndex
      }
    });
  } catch (error) {
    console.error('上传分片失败:', error);
    res.status(500).json({
      code: 500,
      message: '分片上传失败',
      data: null
    });
  }
});

// 路由：合并分片
app.post('/v1/file/upload/chunk/merge', authenticateToken, async (req, res) => {
  try {
    const { uploadId, fileName, fileSize, chunkCount } = req.body;
    
    // 确保上传目录存在
    await ensureDir(uploadDir);
    
    // 生成最终文件路径
    const finalFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}_${fileName}`;
    const finalFilePath = path.join(uploadDir, finalFileName);
    
    // 创建写入流
    const writeStream = require('fs').createWriteStream(finalFilePath);
    
    // 按顺序合并分片
    for (let i = 0; i < chunkCount; i++) {
      const chunkFileName = `chunk_${i}`;
      const chunkFilePath = path.join(chunkDir, uploadId, chunkFileName);
      
      try {
        const chunkData = await fs.readFile(chunkFilePath);
        writeStream.write(chunkData);
      } catch (error) {
        console.error(`读取分片 ${i} 时出错:`, error);
      }
    }
    
    // 关闭写入流
    writeStream.end();
    
    // 等待写入完成
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
    
    // 生成文件ID
    const fileId = generateFileId();
    
    // 模拟存储文件信息
    const fileRecord = {
      id: fileId,
      name: fileName,
      path: finalFilePath,
      size: parseInt(fileSize),
      type: 'application/octet-stream',
      extension: path.extname(fileName),
      checksum: 'mock-checksum-' + Date.now(),
      version: 1,
      createdBy: req.user.id,
      createdAt: new Date(),
      status: 'active'
    };
    
    files.set(fileId, fileRecord);
    
    // 清理分片文件
    try {
      const chunkUploadDir = path.join(chunkDir, uploadId);
      await fs.rm(chunkUploadDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('清理分片文件时出错:', error);
    }
    
    console.log(`分片合并成功: ${fileName}, 大小: ${fileSize} bytes`);
    
    res.json({
      code: 200,
      message: '分片合并成功',
      data: {
        id: fileId,
        name: fileName,
        path: finalFilePath,
        size: parseInt(fileSize),
        type: fileRecord.type
      }
    });
  } catch (error) {
    console.error('合并分片时出错:', error);
    res.status(500).json({
      code: 500,
      message: '分片合并失败',
      data: null
    });
  }
});

// 路由：获取公共资源
app.get('/v1/file/public', (req, res) => {
  try {
    const { fileId } = req.query;
    
    if (!fileId) {
      return res.status(400).json({
        code: 400,
        message: '缺少文件ID参数',
        data: null
      });
    }
    
    const file = files.get(fileId);
    if (!file) {
      return res.status(404).json({
        code: 404,
        message: '文件不存在',
        data: null
      });
    }
    
    res.json({
      code: 200,
      message: 'Success',
      data: {
        id: file.id,
        name: file.name,
        path: file.path,
        size: file.size,
        type: file.type,
        extension: file.extension,
        createdAt: file.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 启动服务器
async function startServer() {
  try {
    await ensureDir(uploadDir);
    await ensureDir(chunkDir);
    await ensureDir(tempDir);
    
    app.listen(PORT, () => {
      console.log(`文件上传测试服务器运行在 http://localhost:${PORT}`);
      console.log(`打开 http://localhost:${PORT}/fileUpload.html 测试文件上传`);
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
  }
}

startServer();