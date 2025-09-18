import mongoose, { Document, Schema, Model } from 'mongoose';

// 文件权限角色枚举
export enum FilePermissionRole {
  OWNER = 'owner',
  EDITOR = 'editor',
  VIEWER = 'viewer'
}

// 文件权限数据结构接口
export interface IFilePermission extends Document {
  id: string;
  fileId: string; // 关联文件ID
  userId: string; // 关联用户ID
  role: FilePermissionRole;
  createdAt: Date;
  
  // 实例方法
  canEdit: () => boolean;
  canView: () => boolean;
}

// 文件权限模型接口
export interface IFilePermissionModel extends Model<IFilePermission> {
  // 静态方法
  findByFile: (fileId: string) => Promise<IFilePermission[]>;
  findByUser: (userId: string) => Promise<IFilePermission[]>;
  findByFileAndUser: (fileId: string, userId: string) => Promise<IFilePermission | null>;
  getUserPermissionsForFile: (fileId: string, userId: string) => Promise<FilePermissionRole | null>;
}

// 文件权限Schema
const filePermissionSchema: Schema<IFilePermission> = new Schema({
  fileId: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: Object.values(FilePermissionRole),
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // 自动管理createdAt和updatedAt
});

// 索引
filePermissionSchema.index({ fileId: 1 });
filePermissionSchema.index({ userId: 1 });
filePermissionSchema.index({ fileId: 1, userId: 1 }, { unique: true }); // 确保文件和用户组合唯一
filePermissionSchema.index({ role: 1 });
filePermissionSchema.index({ createdAt: -1 });

// 实例方法：检查是否可以编辑
filePermissionSchema.methods.canEdit = function (): boolean {
  return this.role === FilePermissionRole.OWNER || this.role === FilePermissionRole.EDITOR;
};

// 实例方法：检查是否可以查看
filePermissionSchema.methods.canView = function (): boolean {
  return true; // 所有角色都可以查看
};

// 静态方法：通过文件ID查找权限
filePermissionSchema.statics.findByFile = async function (fileId: string): Promise<IFilePermission[]> {
  return this.find({ fileId });
};

// 静态方法：通过用户ID查找权限
filePermissionSchema.statics.findByUser = async function (userId: string): Promise<IFilePermission[]> {
  return this.find({ userId });
};

// 静态方法：通过文件ID和用户ID查找权限
filePermissionSchema.statics.findByFileAndUser = async function (fileId: string, userId: string): Promise<IFilePermission | null> {
  return this.findOne({ fileId, userId });
};

// 静态方法：获取用户对文件的权限
filePermissionSchema.statics.getUserPermissionsForFile = async function (fileId: string, userId: string): Promise<FilePermissionRole | null> {
  const permission = await this.findOne({ fileId, userId });
  return permission ? permission.role : null;
};

// 创建并导出模型
const FilePermission: IFilePermissionModel = mongoose.model<IFilePermission, IFilePermissionModel>('FilePermission', filePermissionSchema);

export default FilePermission;