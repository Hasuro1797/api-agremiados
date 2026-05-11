import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { EnvConfig } from 'src/config/index.js';
import { JwtPayload } from '../types/index.js';
import { PrismaService } from 'src/db/prisma.service';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    config: ConfigService<EnvConfig>,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('RT_JWT_SECRET', { infer: true })!,
      passReqToCallback: true,
      ignoreExpiration: false,
    });
  }

  async validate(
    req: Request,
    payload: JwtPayload,
  ): Promise<JwtPayload & { refreshToken: string }> {
    const refreshToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token no proporcionado');
    }

    // Check if the refresh token has been revoked
    const revoked = await this.prisma.revokedToken.findUnique({
      where: { token: refreshToken },
    });

    if (revoked) {
      throw new UnauthorizedException(
        'El refresh token ha sido revocado. Inicia sesión nuevamente',
      );
    }

    return { ...payload, refreshToken };
  }
}
