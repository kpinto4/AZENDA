import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PasswordModule } from './password.module';

@Module({
  imports: [
    PasswordModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => {
        const isProd = (process.env.NODE_ENV ?? '').trim().toLowerCase() === 'production';
        const secret = (process.env.JWT_SECRET ?? '').trim();
        if (isProd) {
          if (!secret) {
            throw new Error('JWT_SECRET es obligatorio cuando NODE_ENV es production');
          }
          if (secret === 'dev-only-secret-change-me') {
            throw new Error('JWT_SECRET no puede ser el valor de desarrollo en production');
          }
        }
        return {
          secret: secret || 'dev-only-secret-change-me',
          signOptions: {
            /** segundos; 12 h (override con `JWT_EXPIRES_IN_SEC` numérico) */
            expiresIn: Number(process.env.JWT_EXPIRES_IN_SEC) || 60 * 60 * 12,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
