import { existsSync } from 'node:fs';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DemoResetService } from '../src/demo/demo-reset.service';

/** Reset parcial del tenant demo. Uso: npm run demo:reset */
async function main() {
  const cwd = process.cwd();
  const monoRoot = resolve(cwd, '..');
  if (existsSync(resolve(monoRoot, '.env'))) {
    loadEnv({ path: resolve(monoRoot, '.env') });
  }
  loadEnv({ path: resolve(cwd, '.env'), override: true });
  const logger = new Logger('DemoReset');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const reset = app.get(DemoResetService);
    const result = await reset.resetDemoTenantPartial();
    logger.log(`Reset demo terminado: ${JSON.stringify(result)}`);
  } finally {
    await app.close();
  }
}

void main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
