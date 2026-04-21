import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { JwtPayload } from '../auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev-only-secret-change-me',
    });
  }

  async validate(payload: JwtPayload) {
    const user = this.authService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Usuario no activo');
    }

    const { password: _password, ...safeUser } = user;
    return safeUser;
  }
}
