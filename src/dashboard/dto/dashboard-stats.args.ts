import { ArgsType, Field } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { FiltersMemberInput } from 'src/members/dto/filter-member.args';
import { ReservationRequestFiltersInput } from 'src/reservation/dto/reservation-requests.args';
import { FiltersSurveyInput } from 'src/survey/dto/filters.arg';

@ArgsType()
export class DashboardStatsArgs {
  @Field(() => FiltersMemberInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => FiltersMemberInput)
  memberFilters?: FiltersMemberInput;

  @Field(() => FiltersSurveyInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => FiltersSurveyInput)
  surveyFilters?: FiltersSurveyInput;

  @Field(() => ReservationRequestFiltersInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReservationRequestFiltersInput)
  reservationFilters?: ReservationRequestFiltersInput;
}
