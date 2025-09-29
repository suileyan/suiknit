// 邮件服务配置（编辑此文件以配置邮件发送）
export interface EmailConfig {
  enabled: boolean; // 是否启用邮件发送
  host: string;
  port: number;
  secure: boolean; // 465 使用 true，其余端口多为 false
  auth: {
    user: string;
    pass: string;
  };
  from?: string; // 默认发件人（可不填，默认与 user 相同）
}

const emailConfig: EmailConfig = {
  enabled: true,
  host: 'smtp.qq.com',
  port: 465,
  secure: true,
  auth: {
    user: 'your_email',
    pass: 'your_key'
  },
  from: 'your_website or your_email'
};

export default emailConfig;
