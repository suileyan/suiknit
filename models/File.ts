import mongoose, { Document, Schema, Model } from 'mongoose';

// 文件状态枚举
export enum FileStatus {
  ACTIVE = 'active',
  DELETED = 'deleted',
  ARCHIVED = 'archived'
}

// 文件标签接口
export interface IFileTag {
  key: string;
  value: string;
}

// 文件数据结构接口
export interface IFile extends Document {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  extension: string;
  checksum: string;
  version: number;
  createdBy: string; // 关联用户ID
  createdAt: Date;
  status: FileStatus;
  tags: IFileTag[];
  description: string;
  
  // 实例方法
  getPath: () => string;
  getPublicUrl: () => string;
}

// 文件模型接口
export interface IFileModel extends Model<IFile> {
  // 静态方法
  findByUser: (userId: string) => Promise<IFile[]>;
  findByTag: (tagKey: string, tagValue: string) => Promise<IFile[]>;
  findActive: () => Promise<IFile[]>;
}

// 文件Schema
const fileSchema: Schema<IFile> = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  path: {
    type: String,
    required: true,
    trim: true
  },
  size: {
    type: Number,
    required: true,
    min: 0
  },
  type: {
    type: String,
    required: true,
    trim: true
  },
  extension: {
    type: String,
    required: true,
    trim: true
  },
  checksum: {
    type: String,
    required: true,
    trim: true
  },
  version: {
    type: Number,
    default: 1
  },
  createdBy: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: Object.values(FileStatus),
    default: FileStatus.ACTIVE
  },
  tags: [{
    key: {
      type: String,
      required: true,
      trim: true
    },
    value: {
      type: String,
      required: true,
      trim: true
    }
  }],
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  }
}, {
  timestamps: true // 自动管理createdAt和updatedAt
});

// 索引
fileSchema.index({ createdBy: 1 });
fileSchema.index({ checksum: 1 });
fileSchema.index({ status: 1 });
fileSchema.index({ createdAt: -1 });
fileSchema.index({ name: 1 });

// 实例方法：获取文件路径
fileSchema.methods.getPath = function (): string {
  return this.path;
};

// 实例方法：获取文件公共URL
fileSchema.methods.getPublicUrl = function (): string {
  // 这里应该根据实际部署环境返回正确的URL
  return `/file/public/${this.id}`;
};

// 静态方法：通过用户ID查找文件
fileSchema.statics.findByUser = async function (userId: string): Promise<IFile[]> {
  return this.find({ createdBy: userId });
};

// 静态方法：通过标签查找文件
fileSchema.statics.findByTag = async function (tagKey: string, tagValue: string): Promise<IFile[]> {
  return this.find({ 'tags.key': tagKey, 'tags.value': tagValue });
};

// 静态方法：查找所有活跃文件
fileSchema.statics.findActive = async function (): Promise<IFile[]> {
  return this.find({ status: FileStatus.ACTIVE });
};

// 创建并导出模型
const File: IFileModel = mongoose.model<IFile, IFileModel>('File', fileSchema);

export default File;