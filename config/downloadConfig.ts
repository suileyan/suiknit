// 下载令牌与下载配置
export interface DownloadConfig {
  downloadTokenSecret: string;
  downloadTokenExpiresIn: string; // 例如 '5m' 或 '300s'
  tokenRateLimit: number; // 秒
  tokenReuseMode: 'range_only' | 'single_use' | 'multi_use';
}

const downloadConfig: DownloadConfig = {
  downloadTokenSecret: 'download_secret_key',
  downloadTokenExpiresIn: '5m',
  tokenRateLimit: 20,
  tokenReuseMode: 'range_only'
};

export default downloadConfig;

