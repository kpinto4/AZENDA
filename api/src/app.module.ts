import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AccessController } from './access/access.controller';

@Module({
  imports: [AuthModule],
  controllers: [AppController, AccessController],
  providers: [AppService],
})
export class AppModule {}
