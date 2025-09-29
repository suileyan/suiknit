// 邮箱验证码相关配置
export interface AuthCodeConfig {
  expire: number; // 秒
  limit: number; // 频控，秒
}

const authCodeConfig: AuthCodeConfig = {
  expire: 300,
  limit: 60
};

export default authCodeConfig;

