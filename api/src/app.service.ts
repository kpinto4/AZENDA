import { Injectable } from '@nestjs/common';
import { PgClientService } from './infrastructure/sql-db/pg-client.service';

@Injectable()
export class AppService {
  constructor(private readonly pg: PgClientService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getHealth(): Promise<{
    status: 'ok' | 'degraded';
    checks: { database: 'up' | 'down' };
    timestamp: string;
  }> {
    const dbUp = await this.pg.ping();
    return {
      status: dbUp ? 'ok' : 'degraded',
      checks: { database: dbUp ? 'up' : 'down' },
      timestamp: new Date().toISOString(),
    };
  }
}
