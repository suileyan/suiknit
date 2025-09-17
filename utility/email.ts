import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import dotenv from 'dotenv';
import { writeLog } from './logger.js';
import { Request } from 'express';

dotenv.config({ path: '.env.config' });

// 邮件配置接口
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// 邮件对象接口
interface EmailObject {
  email: string;
  content: string;
}

// 邮件发送结果接口
interface EmailResult {
  success: boolean;
  message: string;
  email?: string;
}

class EmailService {
  private transporter: Transporter;
  private defaultFrom: string;

  constructor() {
    // 从环境变量获取邮件配置
    const emailConfig: EmailConfig = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || ''
      }
    };

    this.defaultFrom = process.env.EMAIL_FROM || emailConfig.auth.user;
    this.transporter = nodemailer.createTransport(emailConfig);

    // 验证配置
    this.verifyConfig();
  }

  // 验证邮件配置
  private async verifyConfig(): Promise<void> {
    try {
      await this.transporter.verify();
      console.log('邮件服务器连接成功');
    } catch (error) {
      console.error('邮件服务器连接失败:', error);
    }
  }

  // 记录日志
  private async logEmailResult(result: EmailResult, subject: string, content: string): Promise<void> {
    try {
      // 创建一个模拟的请求对象用于日志记录
      const mockReq = {
        ip: '127.0.0.1',
        path: '/email/send',
        method: 'EMAIL',
        query: {},
        body: { subject, content }
      } as unknown as Request;
      
      // 记录发送结果
      await writeLog(mockReq, result, result.success ? 200 : 500);
    } catch (error) {
      console.error('邮件日志记录失败:', error);
    }
  }

  // 发送单个邮件
  private async sendSingleEmail(options: SendMailOptions): Promise<EmailResult> {
    try {
      await this.transporter.sendMail(options);
      const to = options.to;
      return {
        success: true,
        message: '邮件发送成功',
        email: Array.isArray(to) ? to.join(', ') : to as string
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      const to = options.to;
      return {
        success: false,
        message: `邮件发送失败: ${errorMessage}`,
        email: Array.isArray(to) ? to.join(', ') : to as string
      };
    }
  }

  // 发送邮件 - 支持多种格式
  async send(
    recipients: string | string[] | Record<string, string> | EmailObject[],
    subject: string,
    content: string
  ): Promise<EmailResult[]> {
    try {
      let results: EmailResult[];
      
      // 情况1: 单个邮箱地址
      if (typeof recipients === 'string') {
        const result = await this.sendSingleEmail({
          from: this.defaultFrom,
          to: recipients,
          subject,
          text: content
        });
        results = [result];
      }
      // 情况2: 邮箱地址数组
      else if (Array.isArray(recipients) && recipients !== null && recipients.length > 0 && recipients[0] !== null && typeof recipients[0] === 'string') {
        results = [];
        for (const email of recipients as string[]) {
          const result = await this.sendSingleEmail({
            from: this.defaultFrom,
            to: email,
            subject,
            text: content
          });
          results.push(result);
        }
      }
      // 情况3: 对象格式 {email: content}
      else if (!Array.isArray(recipients) && typeof recipients === 'object' && recipients !== null) {
        results = [];
        for (const [email, emailContent] of Object.entries(recipients)) {
          const result = await this.sendSingleEmail({
            from: this.defaultFrom,
            to: email,
            subject,
            text: emailContent
          });
          results.push(result);
        }
      }
      // 情况4: 数组对象格式 [{email: '', content: ''}]
      else if (Array.isArray(recipients) && recipients !== null && recipients.length > 0 && recipients[0] !== null && typeof recipients[0] === 'object') {
        results = [];
        for (const item of recipients as EmailObject[]) {
          const result = await this.sendSingleEmail({
            from: this.defaultFrom,
            to: item.email,
            subject,
            text: item.content
          });
          results.push(result);
        }
      }
      // 不支持的格式
      else {
        results = [{
          success: false,
          message: '不支持的收件人格式'
        }];
      }
      
      // 记录日志
      for (const result of results) {
        await this.logEmailResult(result, subject, content);
      }
      
      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      const errorResult = {
        success: false,
        message: `邮件发送失败: ${errorMessage}`
      };
      
      // 记录错误日志
      await this.logEmailResult(errorResult, subject, content);
      
      return [errorResult];
    }
  }

  // 发送HTML邮件
  async sendHtml(
    recipients: string | string[] | Record<string, string> | EmailObject[],
    subject: string,
    htmlContent: string
  ): Promise<EmailResult[]> {
    try {
      let results: EmailResult[];
      
      // 情况1: 单个邮箱地址
      if (typeof recipients === 'string') {
        const result = await this.sendSingleEmail({
          from: this.defaultFrom,
          to: recipients,
          subject,
          html: htmlContent
        });
        results = [result];
      }
      // 情况2: 邮箱地址数组
      else if (Array.isArray(recipients) && recipients !== null && recipients.length > 0 && recipients[0] !== null && typeof recipients[0] === 'string') {
        results = [];
        for (const email of recipients as string[]) {
          const result = await this.sendSingleEmail({
            from: this.defaultFrom,
            to: email,
            subject,
            html: htmlContent
          });
          results.push(result);
        }
      }
      // 情况3: 对象格式 {email: content}
      else if (!Array.isArray(recipients) && typeof recipients === 'object' && recipients !== null) {
        results = [];
        for (const [email, emailContent] of Object.entries(recipients)) {
          const result = await this.sendSingleEmail({
            from: this.defaultFrom,
            to: email,
            subject,
            html: emailContent
          });
          results.push(result);
        }
      }
      // 情况4: 数组对象格式 [{email: '', content: ''}]
      else if (Array.isArray(recipients) && recipients !== null && recipients.length > 0 && recipients[0] !== null && typeof recipients[0] === 'object') {
        results = [];
        for (const item of recipients as EmailObject[]) {
          const result = await this.sendSingleEmail({
            from: this.defaultFrom,
            to: item.email,
            subject,
            html: item.content
          });
          results.push(result);
        }
      }
      // 不支持的格式
      else {
        results = [{
          success: false,
          message: '不支持的收件人格式'
        }];
      }
      
      // 记录日志
      for (const result of results) {
        await this.logEmailResult(result, subject, htmlContent);
      }
      
      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      const errorResult = {
        success: false,
        message: `邮件发送失败: ${errorMessage}`
      };
      
      // 记录错误日志
      await this.logEmailResult(errorResult, subject, htmlContent);
      
      return [errorResult];
    }
  }
}

// 导出单例实例
export const emailService = new EmailService();