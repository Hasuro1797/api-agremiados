import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/db/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EnvConfig } from 'src/config/index';

@Injectable()
export class RevokedTokenCleanupTask {
  private readonly logger = new Logger(RevokedTokenCleanupTask.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService<EnvConfig>,
  ) {}

  /**
   * Runs every day at 3:00 AM.
   * Deletes revoked refresh tokens that have already expired,
   * since there's no point keeping them once they can't be used.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredRevokedTokens() {
    this.logger.log('Iniciando limpieza de tokens revocados expirados...');

    const rtSecret = this.config.get('RT_JWT_SECRET', { infer: true })!;

    try {
      const revokedTokens = await this.prisma.revokedToken.findMany();
      const expiredIds: number[] = [];

      for (const record of revokedTokens) {
        try {
          this.jwtService.verify(record.token, { secret: rtSecret });
          // Token is still valid, keep it in the revoked list
        } catch {
          // Token expired or invalid — safe to remove
          expiredIds.push(record.id);
        }
      }

      if (expiredIds.length > 0) {
        const { count } = await this.prisma.revokedToken.deleteMany({
          where: { id: { in: expiredIds } },
        });
        this.logger.log(`Eliminados ${count} tokens revocados expirados`);
      } else {
        this.logger.log('No se encontraron tokens revocados expirados');
      }
    } catch (error) {
      this.logger.error('Error durante la limpieza de tokens revocados', error);
    }
  }

  /**
   * Runs every day at 4:00 AM.
   * Deletes expired recovery password records.
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async cleanupExpiredRecoveryPasswords() {
    this.logger.log(
      'Iniciando limpieza de recuperaciones de contraseña expiradas...',
    );

    try {
      const { count } = await this.prisma.recoveryPassword.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });

      this.logger.log(
        `Eliminadas ${count} recuperaciones de contraseña expiradas`,
      );
    } catch (error) {
      this.logger.error(
        'Error durante la limpieza de recuperaciones de contraseña',
        error,
      );
    }
  }
}
