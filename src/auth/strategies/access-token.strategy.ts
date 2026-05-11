import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { EnvConfig } from 'src/config/index.js';
import { PrismaService } from 'src/db/prisma.service';
import { JwtPayloadWithAccess } from '../types/jwt-payload.type.js';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService<EnvConfig>,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('AT_JWT_SECRET', { infer: true })!,
      passReqToCallback: true,
      ignoreExpiration: false,
    });
  }

  async validate(
    req: Request,
    payload: JwtPayloadWithAccess,
  ): Promise<JwtPayloadWithAccess> {
    const accessToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    if (!accessToken) {
      throw new UnauthorizedException('Access token no proporcionado');
    }
    const revoked = await this.prisma.revokedToken.findUnique({
      where: { token: accessToken },
    });

    if (revoked) {
      throw new UnauthorizedException(
        'El access token ha sido revocado. Inicia sesión nuevamente',
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, status: true },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (user.status === 'INACTIVE') {
      throw new UnauthorizedException(
        'Tu cuenta está inactiva. Contacta al administrador',
      );
    }

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Tu cuenta está suspendida por sanción');
    }

    if (user.status === 'BLOCKED') {
      throw new UnauthorizedException(
        'Tu cuenta está bloqueada por mora. Regulariza tus pagos',
      );
    }

    return {
      ...payload,
      accessToken,
    };
  }
}
