import { Injectable } from '@nestjs/common';
import { PgClientService } from '../pg-client.service';
import {
  DEFAULT_PLATFORM_SITE_CONFIG,
  PlatformSiteConfig,
  PlatformSiteLandingCopy,
} from '../sql-db.types';

@Injectable()
export class PlatformSiteConfigRepository {
  constructor(private readonly pg: PgClientService) {}

  private round2(value: number): number {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  merge(
    base: PlatformSiteConfig,
    patch: Partial<PlatformSiteConfig> & {
      landing?: Partial<PlatformSiteLandingCopy>;
    },
  ): PlatformSiteConfig {
    const landing: PlatformSiteLandingCopy = { ...base.landing };
    if (patch.landing) {
      const keys = Object.keys(
        DEFAULT_PLATFORM_SITE_CONFIG.landing,
      ) as (keyof PlatformSiteLandingCopy)[];
      for (const key of keys) {
        const v = patch.landing[key];
        if (v !== undefined) {
          landing[key] = v;
        }
      }
    }
    const out: PlatformSiteConfig = { ...base, landing };
    if (patch.currencyCode !== undefined) {
      const t = String(patch.currencyCode).trim().slice(0, 12);
      if (t.length) {
        out.currencyCode = t;
      }
    }
    if (patch.currencySymbol !== undefined) {
      const t = String(patch.currencySymbol).slice(0, 8);
      if (t.length) {
        out.currencySymbol = t;
      }
    }
    if (patch.planPriceBasic !== undefined) {
      out.planPriceBasic = Math.min(
        1_000_000,
        Math.max(0, this.round2(Number(patch.planPriceBasic))),
      );
    }
    if (patch.planPricePro !== undefined) {
      out.planPricePro = Math.min(
        1_000_000,
        Math.max(0, this.round2(Number(patch.planPricePro))),
      );
    }
    if (patch.planPriceBusiness !== undefined) {
      out.planPriceBusiness = Math.min(
        1_000_000,
        Math.max(0, this.round2(Number(patch.planPriceBusiness))),
      );
    }
    return out;
  }

  async ensureTableAndDefaultRow(): Promise<void> {
    const payload = JSON.stringify(DEFAULT_PLATFORM_SITE_CONFIG);
    await this.pg.execScript(`
      CREATE TABLE IF NOT EXISTS platform_site_config (
        id TEXT PRIMARY KEY,
        payload_json TEXT NOT NULL
      )
    `);
    await this.pg.exec(
      `INSERT INTO platform_site_config (id, payload_json) VALUES ('default', ?) ON CONFLICT (id) DO NOTHING`,
      [payload],
    );
  }

  async get(): Promise<PlatformSiteConfig> {
    await this.ensureTableAndDefaultRow();
    const row = await this.pg.queryOne(
      `SELECT payload_json FROM platform_site_config WHERE id = 'default'`,
    );
    if (!row?.payload_json) {
      return structuredClone(DEFAULT_PLATFORM_SITE_CONFIG);
    }
    try {
      const parsed = JSON.parse(
        String(row.payload_json),
      ) as Partial<PlatformSiteConfig>;
      return this.merge(structuredClone(DEFAULT_PLATFORM_SITE_CONFIG), parsed);
    } catch {
      return structuredClone(DEFAULT_PLATFORM_SITE_CONFIG);
    }
  }

  async patch(
    patch: Partial<PlatformSiteConfig> & {
      landing?: Partial<PlatformSiteLandingCopy>;
    },
  ): Promise<PlatformSiteConfig> {
    const current = await this.get();
    const next = this.merge(current, patch);
    await this.ensureTableAndDefaultRow();
    const json = JSON.stringify(next);
    await this.pg.exec(
      `UPDATE platform_site_config SET payload_json = ? WHERE id = 'default'`,
      [json],
    );
    return next;
  }
}
