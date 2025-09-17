import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.config' });

// 用户权限枚举
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator'
}

// 用户数据结构接口
export interface IUser extends Document {
  id: string;
  email: string;
  name: string;
  password: string;
  avatarPath?: string;
  role: UserRole;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // 实例方法
  comparePassword: (password: string) => Promise<boolean>;
}

// 用户模型接口
export interface IUserModel extends Model<IUser> {
  // 静态方法
  findByEmail: (email: string) => Promise<IUser | null>;
}

// 用户Schema
const userSchema: Schema<IUser> = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, '请输入有效的邮箱地址']
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  avatarPath: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.USER
  },
  lastLoginAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // 自动管理createdAt和updatedAt
});

// 在保存前对密码进行哈希处理
userSchema.pre<IUser>('save', async function (next) {
  // 只有在密码被修改时才进行哈希处理
  if (!this.isModified('password')) return next();
  
  try {
    // 从环境变量获取salt rounds，如果没有则默认为10
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10');
    // 生成salt并哈希密码
    const salt = await bcrypt.genSalt(saltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// 在每次保存时更新updatedAt字段
userSchema.pre<IUser>('save', function (next) {
  if (!this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

// 实例方法：比较密码
userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

// 静态方法：通过邮箱查找用户
userSchema.statics.findByEmail = async function (email: string): Promise<IUser | null> {
  return this.findOne({ email });
};

// 索引
userSchema.index({ email: 1 });
userSchema.index({ name: 1 });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

// 创建并导出模型
const User: IUserModel = mongoose.model<IUser, IUserModel>('User', userSchema);

export default User;