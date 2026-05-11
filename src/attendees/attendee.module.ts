import { Module } from '@nestjs/common';
import { AttendeeResolver } from './attendee.resolver';
import { AttendeeService } from './attendee.service';

@Module({
  providers: [AttendeeResolver, AttendeeService],
})
export class AttendeeModule {}
