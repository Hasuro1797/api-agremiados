import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { SurveyStatus } from 'generated/prisma/enums';
import { Role } from 'generated/prisma/enums';
import { AdminOnly, Roles } from 'src/auth';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { JwtPayloadWithAccess } from 'src/auth/types/jwt-payload.type';
import { CreateSurveyInput } from './dto/create-survey.input';
import { SurveyArgs } from './dto/filters.arg';
import { SubmitSurveyResponseInput } from './dto/submit-survey.input';
import { UpdateSurveyInput } from './dto/update-survey.input';
import { SurveyResults } from './entities/survey-results.entity';
import { SurveyResponse } from './entities/survey-response.entity';
import { Survey } from './entities/survey.entity';
import { Surveys } from './entities/surveys.entity';
import { SurveyService } from './survey.service';

@Resolver(() => Survey)
export class SurveyResolver {
  constructor(private readonly surveyService: SurveyService) {}

  @AdminOnly()
  @Mutation(() => Survey, { name: 'createSurvey' })
  createSurvey(
    @Args('createSurveyInput') createSurveyInput: CreateSurveyInput,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.surveyService.create(createSurveyInput, user.sub);
  }

  @AdminOnly()
  @Query(() => Surveys, { name: 'findAllSurveys' })
  findAll(@Args() surveyArgs: SurveyArgs) {
    return this.surveyService.findAll(
      surveyArgs.page,
      surveyArgs.pageSize,
      surveyArgs.orderBy,
      surveyArgs.search,
      surveyArgs.filters,
    );
  }

  @AdminOnly()
  @Query(() => Survey, { name: 'findOneSurvey' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.surveyService.findOne(id);
  }

  @AdminOnly()
  @Mutation(() => Survey, { name: 'updateSurvey' })
  updateSurvey(
    @Args('updateSurveyInput') updateSurveyInput: UpdateSurveyInput,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.surveyService.update(updateSurveyInput, user.sub);
  }

  @AdminOnly()
  @Mutation(() => Boolean, { name: 'removeSurveys' })
  removeSurveys(
    @Args('ids', { type: () => [Int] }) ids: number[],
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.surveyService.remove(ids, user.sub);
  }

  @AdminOnly()
  @Mutation(() => Boolean, { name: 'changeStatusSurvey' })
  changeStatusSurvey(
    @Args('ids', { type: () => [Int] }) ids: number[],
    @Args('status', { type: () => String }) status: SurveyStatus,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.surveyService.changeStatus(ids, status, user.sub);
  }

  @AdminOnly()
  @Query(() => SurveyResults, { name: 'getSurveyResults' })
  getResults(@Args('id', { type: () => Int }) id: number) {
    return this.surveyService.getResults(id);
  }

  // --- Public / Member endpoints ---

  @Roles(Role.MEMBER, Role.SUPERADMIN)
  @Query(() => [Survey], { name: 'getActiveSurveys' })
  getActiveSurveys() {
    return this.surveyService.getActiveSurveys();
  }

  @Roles(Role.MEMBER, Role.SUPERADMIN)
  @Query(() => Survey, { name: 'findOnePublicSurvey' })
  findOnePublic(@Args('id', { type: () => Int }) id: number) {
    return this.surveyService.findOnePublic(id);
  }

  @Roles(Role.MEMBER, Role.SUPERADMIN)
  @Mutation(() => SurveyResponse, { name: 'submitSurveyResponse' })
  submitResponse(
    @Args('submitSurveyResponseInput') input: SubmitSurveyResponseInput,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.surveyService.submitResponse(input, user.sub);
  }
}
