import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

const DEFAULT_WEB_ORIGIN = 'http://localhost:5173';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? DEFAULT_WEB_ORIGIN });
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
