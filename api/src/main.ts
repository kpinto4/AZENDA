import { existsSync } from 'node:fs';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, type Application, NextFunction, Request, Response, urlencoded } from 'express';

/** .env en la raiz del monorepo y en api/ (Neon DATABASE_URL); api/.env pisa claves de la raiz. */
const cwd = process.cwd();
const monoRoot = resolve(cwd, '..');
if (existsSync(resolve(monoRoot, '.env'))) {
  loadEnv({ path: resolve(monoRoot, '.env') });
}
loadEnv({ path: resolve(cwd, '.env'), override: true });

function isLocalDevOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }
  try {
    const h = new URL(origin).hostname.toLowerCase();
    return (
      h === 'localhost' ||
      h === '127.0.0.1' ||
      h === '[::1]' ||
      h === '::1'
    );
  } catch {
    return false;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const extraOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // CORS antes de body parsers para que OPTIONS responda sin pasar por json().
  // Sin `allowedHeaders` fijos: `cors` replica Access-Control-Request-Headers en el preflight.
  app.enableCors({
    origin: (origin, callback) => {
      if (isLocalDevOrigin(origin)) {
        callback(null, true);
        return;
      }
      if (origin && extraOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  });
  app.use(json({ limit: '3mb' }));
  app.use(urlencoded({ extended: true, limit: '3mb' }));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  /** Evita 304/caché en XHR (login, contexto JWT, etc.) que dejan el cuerpo vacío en el cliente. */
  const expressApp = app.getHttpAdapter().getInstance() as Application;
  expressApp.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
