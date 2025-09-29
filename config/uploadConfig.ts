// 上传与分片配置
export interface UploadConfig {
  uploadDir: string; // 上传根目录
  maxFileSize: number; // 单文件最大字节数
  allowedTypes: string[]; // 允许类型（支持 image/* 等）
  enableChunkedUpload: boolean; // 启用分片上传
  chunkDir: string; // 分片临时目录
  chunkMaxSize: number; // 单个分片最大字节数
}

const uploadConfig: UploadConfig = {
  uploadDir: './resource/uploads',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/*', 'text/*', 'application/pdf'],
  enableChunkedUpload: true,
  chunkDir: './resource/chunks',
  chunkMaxSize: 50 * 1024 * 1024 // 50MB
};

export default uploadConfig;

