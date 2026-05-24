import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentService } from '../payment.service';

@Injectable()
export class ExpirePaymentsTask {
  private readonly logger = new Logger(ExpirePaymentsTask.name);

  constructor(private readonly paymentService: PaymentService) {}

  // Cada 5 minutos: expira reservas cuyo token Izipay (15 min) ya venció
  // y libera el stock/cupo asociado.
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiry() {
    try {
      await this.paymentService.expirePendingPayments();
    } catch (err) {
      this.logger.error('Error expirando pagos pendientes', err);
    }
  }
}
