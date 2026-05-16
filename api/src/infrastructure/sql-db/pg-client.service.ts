import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

/**
 * Pool PostgreSQL y helpers de consulta (? → $n) compartidos por {@link SqlDbService} y repositorios.
 */
@Injectable()
export class PgClientService implements OnModuleDestroy {
  private readonly logger = new Logger(PgClientService.name);
  private readonly pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL?.trim();
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL es obligatorio. Este proyecto usa Neon como base principal.',
      );
    }
    const sslMode = (process.env.PGSSLMODE ?? '').trim().toLowerCase();
    const requireSsl =
      sslMode === 'require' ||
      ['1', 'true', 'yes', 'on'].includes(String(process.env.PGSSL ?? '').trim().toLowerCase()) ||
      (connectionString?.toLowerCase().includes('sslmode=require') ?? false);
    const ssl = requireSsl ? { rejectUnauthorized: false } : undefined;
    this.pool = new Pool({
      connectionString,
      ssl,
      max: 10,
    });
    let hostHint = 'remoto';
    try {
      const u = new URL(connectionString);
      if (u.hostname) {
        hostHint = u.hostname;
      }
    } catch {
      /* URL de conexion no parseable */
    }
    this.logger.log(`Postgres por DATABASE_URL (${hostHint}; p. ej. Neon)`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  private toPgSql(sql: string): string {
    let n = 0;
    return sql.replace(/\?/g, () => `$${++n}`);
  }

  async queryRows(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
    const res = await this.pool.query(this.toPgSql(sql), params);
    return res.rows as Record<string, unknown>[];
  }

  async queryOne(sql: string, params: unknown[] = []): Promise<Record<string, unknown> | undefined> {
    const rows = await this.queryRows(sql, params);
    return rows[0] as Record<string, unknown> | undefined;
  }

  async exec(sql: string, params: unknown[] = []): Promise<void> {
    await this.pool.query(this.toPgSql(sql), params);
  }

  async execScript(sql: string): Promise<void> {
    await this.pool.query(sql);
  }

  async ensureIndex(createSql: string): Promise<void> {
    try {
      await this.pool.query(createSql);
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (code === '42P07') {
        return;
      }
      throw e;
    }
  }
}
