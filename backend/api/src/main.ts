import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

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