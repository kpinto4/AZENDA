import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import {
  json,
  static as expressStatic,
  type Application,
  NextFunction,
  Request,
  Response,
  urlencoded,
} from 'express';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';

/** .env en la raiz del monorepo y en api/ (Neon DATABASE_URL); api/.env pisa claves de la raiz. */
const cwd = process.cwd();
const monoRoot = resolve(cwd, '..');
if (existsSync(resolve(monoRoot, '.env'))) {
  loadEnv({ path: resolve(monoRoot, '.env') });
}
loadEnv({ path: resolve(cwd, '.env'), override: true });

function assertProductionEnvOrThrow(): void {
  const isProd =
    (process.env.NODE_ENV ?? '').trim().toLowerCase() === 'production';
  if (!isProd) {
    return;
  }
  const jwt = (process.env.JWT_SECRET ?? '').trim();
  if (!jwt) {
    throw new Error('JWT_SECRET es obligatorio cuando NODE_ENV=production');
  }
  if (jwt === 'dev-only-secret-change-me') {
    throw new Error(
      'JWT_SECRET no puede ser el valor de desarrollo en production',
    );
  }
  if (!(process.env.CORS_ORIGINS ?? '').trim()) {
    throw new Error(
      'CORS_ORIGINS es obligatorio en production (origenes permitidos, separados por coma).',
    );
  }
}

function isLocalDevOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }
  try {
    const h = new URL(origin).hostname.toLowerCase();
    return (
      h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1'
    );
  } catch {
    return false;
  }
}

/** Carpeta del build Angular (`dist/azenda/browser`) para despliegue en un solo servidor. */
function resolveSpaBrowserRoot(): string | null {
  const cwd = process.cwd();
  const candidates = [
    resolve(cwd, '../dist/azenda/browser'),
    resolve(cwd, 'dist/azenda/browser'),
  ];
  for (const dir of candidates) {
    if (existsSync(join(dir, 'index.html'))) {
      return dir;
    }
  }
  return null;
}

function shouldServeSpaInProduction(): boolean {
  if ((process.env.AZENDA_SERVE_SPA ?? '').trim().toLowerCase() === 'false') {
    return false;
  }
  return (
    (process.env.NODE_ENV ?? '').trim().toLowerCase() === 'production' &&
    resolveSpaBrowserRoot() != null
  );
}

function mountSpaFallback(expressApp: Application, spaRoot: string): void {
  expressApp.use(expressStatic(spaRoot, { index: false, maxAge: '1h' }));
  expressApp.get(/^(?!\/api(\/|$)).*/, (_req: Request, res: Response) => {
    res.sendFile(join(spaRoot, 'index.html'));
  });
}

async function bootstrap() {
  assertProductionEnvOrThrow();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const expressApp = app.getHttpAdapter().getInstance() as Application;
  expressApp.use('/api', helmet());
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
  expressApp.use('/api', (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, private',
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  const spaRoot = resolveSpaBrowserRoot();
  if (shouldServeSpaInProduction() && spaRoot) {
    mountSpaFallback(expressApp, spaRoot);
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
