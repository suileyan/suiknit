import swaggerJsdoc from 'swagger-jsdoc';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: '.env.config' });

const port = process.env.PORT || '3000';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Suiknit API',
      version: '1.0.0',
      description: 'API documentation for the Suiknit application'
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./routes/v1/*.ts', './controllers/v1/*.ts', './routes/v2/*.ts', './controllers/v2/*.ts'] // 指定要扫描的文件路径
};

const specs = swaggerJsdoc(options);
export default specs;