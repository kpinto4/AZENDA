import { Injectable } from '@nestjs/common';
import { PlatformSiteConfigRepository } from '../infrastructure/sql-db/repositories/platform-site-config.repository';
import {
  PlatformSiteConfig,
  PlatformSiteLandingCopy,
} from '../infrastructure/sql-db/sql-db.types';

@Injectable()
export class AdminSiteConfigService {
  constructor(private readonly site: PlatformSiteConfigRepository) {}

  get(): Promise<PlatformSiteConfig> {
    return this.site.get();
  }

  patch(
    dto: Partial<PlatformSiteConfig> & {
      landing?: Partial<PlatformSiteLandingCopy>;
    },
  ): Promise<PlatformSiteConfig> {
    return this.site.patch(dto);
  }
}
