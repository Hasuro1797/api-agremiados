import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Role } from 'generated/prisma/enums';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { JwtPayloadWithAccess } from 'src/auth/types/jwt-payload.type';
import { SupportService } from './support.service';
import {
  AssignSupportInput,
  CreateSupportCategoryInput,
  CreateSupportInput,
  CreateSupportMessageInput,
  RateSupportInput,
  RejectSupportInput,
  ReopenSupportInput,
  ResolveSupportInput,
  SupportFiltersArgs,
} from './dto/index';
import {
  Support,
  SupportCategory,
  SupportMessage,
  SupportPaginated,
} from './entities/index';

@Resolver()
export class SupportResolver {
  constructor(private supportService: SupportService) {}

  // ─── CATEGORIES ───────────────────────────────────────────────

  @Query(() => [SupportCategory], { name: 'supportCategories' })
  getCategories() {
    return this.supportService.getCategories();
  }

  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Mutation(() => SupportCategory, { name: 'createSupportCategory' })
  createCategory(@Args('input') input: CreateSupportCategoryInput) {
    return this.supportService.createCategory(input);
  }

  // ─── QUERIES ──────────────────────────────────────────────────

  @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MODERATOR)
  @Query(() => SupportPaginated, { name: 'supports' })
  findAll(@Args() filters: SupportFiltersArgs) {
    return this.supportService.findAll(filters);
  }

  @Query(() => SupportPaginated, { name: 'mySupports' })
  findMine(
    @CurrentUser() user: JwtPayloadWithAccess,
    @Args() filters: SupportFiltersArgs,
  ) {
    return this.supportService.findMine(user.sub, filters);
  }

  @Query(() => Support, { name: 'support' })
  findOne(
    @CurrentUser() user: JwtPayloadWithAccess,
    @Args('id', { type: () => Int }) id: number,
  ) {
    return this.supportService.findOne(id, user.sub, user.role);
  }

  // ─── MUTATIONS: AGREMIADO ─────────────────────────────────────

  @Mutation(() => Support, { name: 'createSupport' })
  create(
    @CurrentUser() user: JwtPayloadWithAccess,
    @Args('input') input: CreateSupportInput,
  ) {
    return this.supportService.create(user.sub, input);
  }

  @Mutation(() => Support, { name: 'reopenSupport' })
  reopen(
    @CurrentUser() user: JwtPayloadWithAccess,
    @Args('input') input: ReopenSupportInput,
  ) {
    return this.supportService.reopen(user.sub, input);
  }

  @Mutation(() => Support, { name: 'rateSupportResolution' })
  rate(
    @CurrentUser() user: JwtPayloadWithAccess,
    @Args('input') input: RateSupportInput,
  ) {
    return this.supportService.rate(user.sub, input);
  }

  // ─── MUTATIONS: COMPARTIDAS (admin + agremiado del reclamo) ───

  @Mutation(() => SupportMessage, { name: 'addSupportMessage' })
  addMessage(
    @CurrentUser() user: JwtPayloadWithAccess,
    @Args('input') input: CreateSupportMessageInput,
  ) {
    return this.supportService.addMessage(user.sub, user.role, input);
  }

  // ─── MUTATIONS: ADMIN ─────────────────────────────────────────

  @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MODERATOR)
  @Mutation(() => Support, { name: 'assignSupport' })
  assign(
    @CurrentUser() user: JwtPayloadWithAccess,
    @Args('input') input: AssignSupportInput,
  ) {
    return this.supportService.assign(user.sub, input);
  }

  @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MODERATOR)
  @Mutation(() => Support, { name: 'resolveSupport' })
  resolve(
    @CurrentUser() user: JwtPayloadWithAccess,
    @Args('input') input: ResolveSupportInput,
  ) {
    return this.supportService.resolve(user.sub, input);
  }

  @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MODERATOR)
  @Mutation(() => Support, { name: 'rejectSupport' })
  reject(
    @CurrentUser() user: JwtPayloadWithAccess,
    @Args('input') input: RejectSupportInput,
  ) {
    return this.supportService.reject(user.sub, input);
  }

  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Mutation(() => Support, { name: 'closeSupport' })
  close(
    @CurrentUser() user: JwtPayloadWithAccess,
    @Args('id', { type: () => Int }) id: number,
  ) {
    return this.supportService.close(user.sub, id);
  }
}
