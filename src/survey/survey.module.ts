import { Module } from '@nestjs/common';
import { SurveyResolver } from './survey.resolver';
import { SurveyService } from './survey.service';

@Module({
  providers: [SurveyResolver, SurveyService],
})
export class SurveyModule {}
