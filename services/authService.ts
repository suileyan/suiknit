import User, { UserRole } from '@/models/User.js';
import { generateJWT } from '@/utility/jwt.js';
import { redisClient } from '@/config/redisConfig.js';
import { emailService } from '@/utility/email.js';
import { redisCacheMiddleware, DB_OPERATION_TYPE } from '@/utility/redisQueue.js';
import { validateEmail, validatePassword, validateName } from '@/validators/authValidator.js';
import {
    ValidationError,
    AuthenticationError,
    RateLimitError,
    NotFoundError
} from '@/exceptions/AppError.js';
import authCodeConfig from '@/config/authCodeConfig.js';

// 邮箱验证码配置（TS）
const emailCodeConfig = {
    expire: authCodeConfig.expire,
    limit: authCodeConfig.limit
};

// 验证图像验证码
export const verifyCaptcha = async (captchaId: string, captchaCode: string): Promise<boolean> => {
    if (!redisClient) {
        console.error('Redis客户端未初始化');
        return false;
    }

    const storedCaptcha = await redisClient.get(captchaId);
    if (!storedCaptcha || storedCaptcha !== captchaCode.toLowerCase()) {
        return false;
    }

    // 验证成功后立即删除验证码，防止重复使用
    await redisClient.del(captchaId);
    return true;
};

// 验证邮箱验证码
export const verifyEmailCode = async (email: string, code: string, type: string): Promise<boolean> => {
    if (!redisClient) {
        console.error('Redis客户端未初始化');
        return false;
    }

    const codeKey = `email_code_${type}_${email}`;
    const storedCode = await redisClient.get(codeKey);
    if (!storedCode || storedCode !== code) {
        return false;
    }

    // 验证成功后立即删除验证码，防止重复使用
    await redisClient.del(codeKey);
    return true;
};

// 用户注册服务
export const registerUser = async (
    email: string,
    password: string,
    name: string
): Promise<{ token: string; user: any }> => {
    // 验证输入参数
    if (!validateEmail(email)) {
        throw new ValidationError('邮箱格式不正确');
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
        throw new ValidationError(passwordValidation.message);
    }

    const nameValidation = validateName(name);
    if (!nameValidation.isValid) {
        throw new ValidationError(nameValidation.message);
    }

    // 检查用户是否已存在
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
        throw new ValidationError('该邮箱已被注册');
    }

    // 创建新用户
    const user = new User({
        email,
        password,
        name,
        role: UserRole.USER
    });

    // 将用户保存操作添加到Redis队列
    await redisCacheMiddleware({
        type: DB_OPERATION_TYPE.INSERT,
        collection: 'users',
        data: {
            email,
            password,
            name,
            role: UserRole.USER,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    });

    // 保存用户到数据库
    const savedUser = await user.save();

    // 生成JWT token
    const token = generateJWT({
        id: savedUser.id,
        email: savedUser.email,
        name: savedUser.name
    });

    return {
        token,
        user: {
            id: savedUser.id,
            email: savedUser.email,
            name: savedUser.name
        }
    };
};

// 用户登录服务（密码登录）
export const loginWithPassword = async (
    email: string,
    password: string
): Promise<{ token: string; user: any }> => {
    // 验证输入参数
    if (!validateEmail(email)) {
        throw new ValidationError('邮箱格式不正确');
    }

    if (!password) {
        throw new ValidationError('密码不能为空');
    }

    // 查找用户
    const user = await User.findByEmail(email);
    if (!user) {
        throw new AuthenticationError('用户不存在');
    }

    // 验证密码
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
        throw new AuthenticationError('密码错误');
    }

    // 更新最后登录时间
    user.lastLoginAt = new Date();
    await user.save();

    // 生成JWT token
    const token = generateJWT({
        id: user.id,
        email: user.email,
        name: user.name
    });

    return {
        token,
        user: {
            id: user.id,
            email: user.email,
            name: user.name
        }
    };
};

// 用户登录服务（邮箱验证码登录）
export const loginWithEmailCode = async (
    email: string
): Promise<{ token: string; user: any }> => {
    // 验证输入参数
    if (!validateEmail(email)) {
        throw new ValidationError('邮箱格式不正确');
    }

    // 查找用户
    const user = await User.findByEmail(email);
    if (!user) {
        throw new AuthenticationError('用户不存在');
    }

    // 更新最后登录时间
    user.lastLoginAt = new Date();
    await user.save();

    // 生成JWT token
    const token = generateJWT({
        id: user.id,
        email: user.email,
        name: user.name
    });

    return {
        token,
        user: {
            id: user.id,
            email: user.email,
            name: user.name
        }
    };
};

// 更新用户信息服务
export const updateUserInfo = async (
    userId: string,
    name?: string,
    avatarPath?: string
): Promise<any> => {
    // 验证输入参数
    if (name) {
        const nameValidation = validateName(name);
        if (!nameValidation.isValid) {
            throw new ValidationError(nameValidation.message);
        }
    }

    // 查找用户
    const user = await User.findById(userId);
    if (!user) {
        throw new NotFoundError('用户不存在');
    }

    // 更新用户信息
    if (name) user.name = name;
    if (avatarPath) {
        const normalizeAvatarPath = (input: string): string => {
            let p = (input || '').replace(/\\/g, '/').replace(/^\.\//, '');
            const uploadDir = (process.env.UPLOAD_DIR || './resource/uploads').replace(/\\/g, '/').replace(/^\.\//, '');
            const marker = 'resource/uploads/';
            const idx = p.indexOf(marker);
            if (idx >= 0) {
                p = p.slice(idx + marker.length);
            } else if (p.startsWith(uploadDir)) {
                p = p.slice(uploadDir.length).replace(/^\//, '');
            }
            return p;
        };
        user.avatarPath = normalizeAvatarPath(avatarPath);
    }
    user.updatedAt = new Date();

    // 将更新操作添加到Redis队列
    await redisCacheMiddleware({
        type: DB_OPERATION_TYPE.UPDATE,
        collection: 'users',
        condition: { _id: user._id },
        data: {
            name: name || user.name,
            avatarPath: avatarPath || user.avatarPath,
            updatedAt: new Date()
        }
    });

    const updatedUser = await user.save();

    return {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        avatarPath: updatedUser.avatarPath,
        role: updatedUser.role
    };
};

// 发送邮箱验证码服务
export const sendEmailVerificationCode = async (
    email: string,
    type: string,
    ip: string
): Promise<boolean> => {
    // 验证输入参数
    if (!validateEmail(email)) {
        throw new ValidationError('邮箱格式不正确');
    }

    if (!type) {
        throw new ValidationError('用途类型不能为空');
    }

    // 检查是否在限制时间内
    const limitKey = `email_code_limit_${type}_${ip}`;
    const isLimited = redisClient ? await redisClient.exists(limitKey) : 0;
    if (isLimited) {
        throw new RateLimitError('请求过于频繁');
    }

    // 生成6位数字验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 存储验证码到Redis，设置过期时间
    const codeKey = `email_code_${type}_${email}`;
    if (redisClient) {
        await redisClient.setEx(codeKey, emailCodeConfig.expire, code);
    } else {
        console.error('Redis客户端未初始化');
        throw new Error('Redis服务不可用');
    }

    // 设置IP限制，防止频繁发送
    if (redisClient) {
        await redisClient.setEx(limitKey, emailCodeConfig.limit, '1');
    } else {
        console.error('Redis客户端未初始化');
        throw new Error('Redis服务不可用');
    }

    // 发送邮件
    const subject = '验证码';
    const content = `您正在${type}，验证码为：${code}，${Math.floor(emailCodeConfig.expire / 60)}分钟内有效。`;

    const emailResult = await emailService.send(email, subject, content);

    // 检查邮件发送结果
    if (emailResult && emailResult.length > 0) {
        const result = emailResult[0];
        return Boolean(result && result.success);

    }

    return false;
};

export default {
    verifyCaptcha,
    verifyEmailCode,
    registerUser,
    loginWithPassword,
    loginWithEmailCode,
    updateUserInfo,
    sendEmailVerificationCode
};
