import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthUser, UserRole } from '../auth.types';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { SYSTEMS_KEY } from '../decorators/systems.decorator';
import { AppSystem } from '../auth.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredSystems = this.reflector.getAllAndOverride<AppSystem[]>(
      SYSTEMS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length && !requiredSystems?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    if (
      requiredRoles?.length &&
      !requiredRoles.some((requiredRole) => requiredRole === user.role)
    ) {
      throw new ForbiddenException('No tienes permisos por rol');
    }

    if (
      requiredSystems?.length &&
      !requiredSystems.every((system) => user.systems.includes(system))
    ) {
      throw new ForbiddenException('No tienes acceso a este sistema');
    }

    return true;
  }
}
