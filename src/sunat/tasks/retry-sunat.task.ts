import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SunatEmissionService } from '../sunat-emission.service';

@Injectable()
export class RetrySunatTask {
  private readonly logger = new Logger(RetrySunatTask.name);

  constructor(private readonly emission: SunatEmissionService) {}

  // Cada 10 minutos: reintenta comprobantes con emisión SUNAT fallida (ERROR/PENDING).
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleRetry() {
    try {
      await this.emission.retryFailed();
    } catch (err) {
      this.logger.error('Error en reintento de emisión SUNAT', err);
    }
  }
}
