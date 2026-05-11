import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { EnvConfig } from './config';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { graphqlUploadExpress } from 'graphql-upload-ts';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<EnvConfig>);

  const ADMIN_URL = config.get('ADMIN_URL', { infer: true })!;
  const FRONTEND_URL = config.get('FRONTEND_URL', { infer: true })!;
  const PORT = config.get('PORT', { infer: true }) ?? 3001;
  const DEVELOPMENT = config.get('NODE_ENV', { infer: true }) === 'production';

  const allowedOrigins = [ADMIN_URL, FRONTEND_URL];
  const isProduction = DEVELOPMENT;
  app.enableCors({
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    origin: (
      origin: string,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (isProduction) {
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'), false);
        }
      } else {
        callback(null, true);
      }
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.use(graphqlUploadExpress());
  await app.listen(PORT);
  logger.log(`Server running on port ${PORT}`);
}
bootstrap();
