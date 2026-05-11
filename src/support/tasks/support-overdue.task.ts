import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupportService } from '../support.service';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class SupportOverdueTask {
  private readonly logger = new Logger(SupportOverdueTask.name);

  constructor(
    private supportService: SupportService,
    private notification: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkOverdue() {
    this.logger.log('Verificando reclamos vencidos...');

    const overdue = await this.supportService.findOverdue();
    if (overdue.length === 0) return;

    this.logger.warn(`${overdue.length} reclamo(s) vencido(s) sin notificar`);

    await Promise.all(
      overdue.map((s) =>
        this.notification
          .notify({
            userId: s.user.id,
            templateCode: 'SUPPORT_OVERDUE',
            triggerKey: 'SUPPORT_OVERDUE',
            context: { topic: s.topic, supportId: s.id },
          })
          .catch((err) =>
            this.logger.error(
              `notify overdue failed for support ${s.id}: ${err.message}`,
            ),
          ),
      ),
    );

    await this.supportService.markOverdueNotified(overdue.map((s) => s.id));
    this.logger.log(`Marcados ${overdue.length} reclamo(s) como notificados`);
  }
}
