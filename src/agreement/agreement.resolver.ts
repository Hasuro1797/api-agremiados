import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { FileUpload, GraphQLUpload } from 'graphql-upload-ts';
import { Status } from 'generated/prisma/enums';
import { AdminOnly } from 'src/auth';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { JwtPayloadWithAccess } from 'src/auth/types/jwt-payload.type';
import { AgreementService } from './agreement.service';
import { CreateAgreementInput } from './dto/create-agreement.input';
import { AgreementArgs } from './dto/filters.args';
import { UpdateAgreementInput } from './dto/update-agreement.input';
import { Agreement } from './entities/agreement.entity';
import { Agreements } from './entities/agrements.entity';
import { PaginationArgs } from 'src/common/dtos';

@Resolver(() => Agreement)
export class AgreementResolver {
  constructor(private readonly agreementService: AgreementService) {}

  @AdminOnly()
  @Mutation(() => Agreement, { name: 'createAgreement' })
  createAgreement(
    @Args('createAgreementInput') createAgreementInput: CreateAgreementInput,
    @Args('coverImage', { type: () => GraphQLUpload, nullable: true })
    coverImage: Promise<FileUpload> | undefined,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.agreementService.create(
      createAgreementInput,
      coverImage,
      user.sub,
    );
  }

  @AdminOnly()
  @Query(() => Agreements, { name: 'findAllAgreements' })
  findAll(@Args() agreementsArgs: AgreementArgs) {
    return this.agreementService.findAll(
      agreementsArgs.page,
      agreementsArgs.pageSize,
      agreementsArgs.orderBy,
      agreementsArgs.search,
      agreementsArgs.filters,
    );
  }

  @AdminOnly()
  @Query(() => Agreement, { name: 'findOneAgreement' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.agreementService.findOne(id);
  }

  @AdminOnly()
  @Mutation(() => Agreement, { name: 'updateAgreement' })
  updateAgreement(
    @Args('updateAgreementInput') updateAgreementInput: UpdateAgreementInput,
    @Args('coverImage', { type: () => GraphQLUpload, nullable: true })
    coverImage: Promise<FileUpload> | undefined,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.agreementService.update(
      updateAgreementInput,
      coverImage,
      user.sub,
    );
  }

  @AdminOnly()
  @Mutation(() => Boolean, { name: 'removeAgreement' })
  removeAgreement(
    @Args('ids', { type: () => [Int] }) ids: number[],
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.agreementService.remove(ids, user.sub);
  }

  @AdminOnly()
  @Mutation(() => Boolean, { name: 'changeStatusAgreement' })
  changeStatusAgreement(
    @Args('ids', { type: () => [Int] }) ids: number[],
    @Args('status', { type: () => String }) status: Status,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.agreementService.changeStatusAgreement(ids, status, user.sub);
  }

  @Query(() => Agreements, { name: 'getAgreementsFromWebsite' })
  getAgreementsFromWebsite(@Args() agreementsArgs: PaginationArgs) {
    return this.agreementService.getAgreementsFromWebsite(
      agreementsArgs.page,
      agreementsArgs.pageSize,
    );
  }

  @Query(() => Agreement, { name: 'findOneAgreementForWebsite' })
  findOneAgreementForWebsite(@Args('id', { type: () => Int }) id: number) {
    return this.agreementService.findOne(id);
  }
}
