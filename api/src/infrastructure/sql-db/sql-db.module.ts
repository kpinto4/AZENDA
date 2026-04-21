import { Global, Module } from '@nestjs/common';
import { SqlDbService } from './sql-db.service';

@Global()
@Module({
  providers: [SqlDbService],
  exports: [SqlDbService],
})
export class SqlDbModule {}
