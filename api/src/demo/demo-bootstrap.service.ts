import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { isDemoFeaturesEnabled } from '../common/env.util';
import { DemoSeedService } from './demo-seed.service';

@Injectable()
export class DemoBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(DemoBootstrapService.name);

  constructor(private readonly demoSeed: DemoSeedService) {}

  async onModuleInit(): Promise<void> {
    if (!isDemoFeaturesEnabled()) {
      return;
    }
    try {
      await this.demoSeed.ensureDemoTenantSeed();
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      const isConn =
        code === 'ECONNREFUSED' ||
        code === 'ENOTFOUND' ||
        code === 'ETIMEDOUT' ||
        code === 'EAI_AGAIN';
      if (isConn) {
        this.logger.warn(
          'Seed del tenant demo omitido: sin conexion a PostgreSQL.',
        );
        return;
      }
      this.logger.error('No se pudo asegurar el tenant demo', err);
    }
  }
}
