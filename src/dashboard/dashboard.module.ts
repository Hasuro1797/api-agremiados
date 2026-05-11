import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardResolver } from './dashboard.resolver';
import { MonthlyReportTask } from './tasks/monthly-report.task';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [MailModule],
  providers: [DashboardResolver, DashboardService, MonthlyReportTask],
})
export class DashboardModule {}
