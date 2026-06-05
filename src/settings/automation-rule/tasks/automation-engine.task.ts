import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AutomationEngineService } from '../automation-engine.service';

/**
 * Dispara el motor de automatizaciones una vez al día y, además, hace un
 * catch-up al arrancar la app: si el servidor estuvo caído cuando tocaba la
 * ejecución diaria, al volver corre las reglas pendientes de hoy. El guard
 * `lastRunAt` del motor evita reenvíos (máx. 1 ejecución por día y regla).
 */
@Injectable()
export class AutomationEngineTask implements OnApplicationBootstrap {
  private readonly logger = new Logger(AutomationEngineTask.name);

  constructor(private readonly engine: AutomationEngineService) {}

  async onApplicationBootstrap() {
    try {
      await this.engine.runDueRules();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Catch-up de automatizaciones falló: ${message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_7AM, { name: 'AUTOMATION_ENGINE' })
  async handleDailyRun() {
    this.logger.log('Ejecutando reglas de automatización...');
    await this.engine.runDueRules();
  }
}
