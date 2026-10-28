import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });
  const configService = app.get(ConfigService);

  // Pasang helmet untuk perlindungan HTTP security headers
  app.use(helmet());

  // Konfigurasi trust proxy jika berada di balik reverse proxy
  const trustProxy =
    configService.get<boolean>('trustProxy') ||
    process.env.TRUST_PROXY === 'true' ||
    process.env.TRUST_PROXY === '1';

  if (trustProxy) {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  // Parse JSON and URL-encoded bodies with 50MB limit to support base64 documents
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  app.setGlobalPrefix('api/v1');

  // Enforce uniform and sanitized error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: configService.get<string[]>('corsOrigins', []),
  });

  const port = configService.get<number>('port', 3000);

  await app.listen(port);
}

await bootstrap();