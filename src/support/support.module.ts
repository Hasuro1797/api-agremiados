import { Module } from '@nestjs/common';
import { SupportService } from './support.service';
import { SupportResolver } from './support.resolver';
import { SupportOverdueTask } from './tasks/support-overdue.task';

@Module({
  providers: [SupportService, SupportResolver, SupportOverdueTask],
})
export class SupportModule {}
