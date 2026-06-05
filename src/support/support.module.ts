import { Module } from '@nestjs/common';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { SupportService } from './support.service';
import { SupportResolver } from './support.resolver';
import { SupportOverdueTask } from './tasks/support-overdue.task';

@Module({
  imports: [CloudinaryModule],
  providers: [SupportService, SupportResolver, SupportOverdueTask],
})
export class SupportModule {}
