import dotenv from 'dotenv';

dotenv.config({ path: '.env.config' });

interface DBConfig {
  host: string | undefined;
  port: string | undefined;
  name: string | undefined;
  username: string;
  password: string;
  getConnectionString: () => string;
}

const dbConfig: DBConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  name: process.env.DB_NAME,
  username: process.env.DB_USERNAME || '',
  password: process.env.DB_PASSWORD || '',
  getConnectionString() {
    // 构建 MongoDB 连接字符串
    let connectionString = 'mongodb://';

    // 添加认证信息
    if (this.username && this.password) {
      connectionString += `${this.username}:${this.password}@`;
    }

    // 添加主机和端口
    connectionString += `${this.host}:${this.port}/${this.name}`;

    return connectionString;
  }
};

export default dbConfig;