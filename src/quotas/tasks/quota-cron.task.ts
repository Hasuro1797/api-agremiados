import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QuotaService } from '../quota.service';

@Injectable()
export class QuotaCronTask implements OnApplicationBootstrap {
  private readonly logger = new Logger(QuotaCronTask.name);

  constructor(private readonly quotaService: QuotaService) {}

  /**
   * Al arrancar el servidor → reconcilia los periodos faltantes de inmediato.
   * Así, si el proceso estuvo caído justo cuando tocaba generar (los cron de
   * @nestjs/schedule no recuperan disparos perdidos), apenas vuelve a estar en
   * línea rellena los periodos pendientes sin esperar al cron diario.
   */
  async onApplicationBootstrap() {
    this.logger.log('Reconciliando periodos de cuota al arranque...');
    try {
      await this.quotaService.ensurePeriodsExist();
    } catch (error) {
      this.logger.error(
        'Error reconciliando periodos de cuota al arranque',
        error,
      );
    }
  }

  /**
   * Todos los días a las 00:05 → asegura (idempotente) que existan los periodos
   * del mes actual y del siguiente. En días donde ya existen es prácticamente
   * gratis (una lectura indexada por periodo); el trabajo pesado ocurre una vez
   * al mes. Este enfoque auto-reparable cubre las caídas del servidor.
   */
  @Cron('0 5 0 * * *')
  async handleEnsurePeriods() {
    this.logger.log('Ejecutando aseguramiento de periodos de cuota...');
    try {
      await this.quotaService.ensurePeriodsExist();
    } catch (error) {
      this.logger.error('Error asegurando periodos de cuota', error);
    }
  }

  /**
   * Todos los días a las 6AM → detecta mora
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async handleOverdueDetection() {
    this.logger.log('Ejecutando detección de mora...');
    try {
      await this.quotaService.detectOverduePayments();
    } catch (error) {
      this.logger.error('Error detectando pagos vencidos', error);
    }
  }
}
