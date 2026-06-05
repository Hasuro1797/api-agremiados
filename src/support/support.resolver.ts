import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { FileUpload, GraphQLUpload } from 'graphql-upload-ts';
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
  UpdateSupportCategoryInput,
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

  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Mutation(() => SupportCategory, { name: 'updateSupportCategory' })
  updateCategory(@Args('input') input: UpdateSupportCategoryInput) {
    return this.supportService.updateCategory(input);
  }

  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Mutation(() => SupportCategory, {
    name: 'setSupportCategoryActive',
    description:
      'Activa/desactiva una categoría. No se borra para no romper la referencia desde reclamos existentes.',
  })
  setCategoryActive(
    @Args('id', { type: () => Int }) id: number,
    @Args('isActive', { type: () => Boolean }) isActive: boolean,
  ) {
    return this.supportService.setCategoryActive(id, isActive);
  }

  // ─── QUERIES ──────────────────────────────────────────────────

  @Roles(Role.ADMIN, Role.SUPERADMIN, Role.SUPPORT_AGENT)
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

  @Mutation(() => Support, {
    name: 'createSupport',
    description:
      'Crea un reclamo. Opcionalmente puedes adjuntar archivos (multipart/form-data via graphql-upload); si se incluyen, se publican como un primer mensaje del agremiado en el hilo. Máx. 10.',
  })
  create(
    @CurrentUser() user: JwtPayloadWithAccess,
    @Args('input') input: CreateSupportInput,
    @Args('files', {
      type: () => [GraphQLUpload],
      nullable: true,
      description:
        'Archivos a adjuntar como evidencia del reporte inicial. Máx. 10.',
    })
    files?: Promise<FileUpload>[],
  ) {
    return this.supportService.create(user.sub, input, files);
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

  @Mutation(() => SupportMessage, {
    name: 'addSupportMessage',
    description:
      'Agrega un mensaje al hilo del reclamo. Acepta hasta 10 archivos adjuntos (multipart/form-data via graphql-upload). Los archivos se suben a Cloudinary y se crean automáticamente como Media con context=SUPPORT.',
  })
  addMessage(
    @CurrentUser() user: JwtPayloadWithAccess,
    @Args('input') input: CreateSupportMessageInput,
    @Args('files', {
      type: () => [GraphQLUpload],
      nullable: true,
      description: 'Archivos a adjuntar al mensaje. Máx. 10.',
    })
    files?: Promise<FileUpload>[],
  ) {
    return this.supportService.addMessage(user.sub, user.role, input, files);
  }

  // ─── MUTATIONS: ADMIN ─────────────────────────────────────────

  @Roles(Role.ADMIN, Role.SUPERADMIN, Role.SUPPORT_AGENT)
  @Mutation(() => Support, { name: 'assignSupport' })
  assign(
    @CurrentUser() user: JwtPayloadWithAccess,
    @Args('input') input: AssignSupportInput,
  ) {
    return this.supportService.assign(user.sub, input);
  }

  @Roles(Role.ADMIN, Role.SUPERADMIN, Role.SUPPORT_AGENT)
  @Mutation(() => Support, { name: 'resolveSupport' })
  resolve(
    @CurrentUser() user: JwtPayloadWithAccess,
    @Args('input') input: ResolveSupportInput,
  ) {
    return this.supportService.resolve(user.sub, input);
  }

  @Roles(Role.ADMIN, Role.SUPERADMIN, Role.SUPPORT_AGENT)
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
