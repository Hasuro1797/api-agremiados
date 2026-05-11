import { Module } from '@nestjs/common';
import { ActivityResolver } from './activity.resolver';
import { ActivityService } from './activity.service';

@Module({
  providers: [ActivityResolver, ActivityService],
  imports: [],
})
export class ActivityModule {}
