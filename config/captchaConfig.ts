// 图形验证码配置
export interface CaptchaConfig {
  size: number; // 字符个数
  width: number;
  height: number;
  expire: number; // 过期秒数
}

const captchaConfig: CaptchaConfig = {
  size: 4,
  width: 120,
  height: 40,
  expire: 300
};

export default captchaConfig;

