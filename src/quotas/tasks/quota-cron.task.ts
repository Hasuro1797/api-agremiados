import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QuotaService } from '../quota.service';

@Injectable()
export class QuotaCronTask {
  private readonly logger = new Logger(QuotaCronTask.name);

  constructor(private readonly quotaService: QuotaService) {}

  /**
   * Cada 1ro del mes a las 00:05 → genera el periodo del mes siguiente
   */
  @Cron('0 5 0 1 * *')
  async handleMonthlyPeriodGeneration() {
    this.logger.log('Ejecutando generación mensual de periodos de cuota...');
    try {
      await this.quotaService.generateMonthlyPeriod();
    } catch (error) {
      this.logger.error('Error generando periodo mensual de cuota', error);
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
