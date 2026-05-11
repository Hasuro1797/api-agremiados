import { Global, Module } from '@nestjs/common';
import { QuotaResolver } from './quota.resolver';
import { QuotaService } from './quota.service';
import { QuotaCronTask } from './tasks/quota-cron.task';

@Global()
@Module({
  providers: [QuotaResolver, QuotaService, QuotaCronTask],
  exports: [QuotaService],
})
export class QuotaModule {}
