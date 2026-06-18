import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Activity } from './entities/academic.entity';

import { Role, Status } from 'generated/prisma/enums';
import { AdminOnly, Roles } from 'src/auth';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { JwtPayloadWithAccess } from 'src/auth/types/jwt-payload.type';
import { ActivityService } from './activity.service';
import {
  ActivitiesArgs,
  CreateActivityInput,
  UpdateActivityInput,
} from './dto';
import { Activities } from './entities/academics.entity';
@Resolver()
export class ActivityResolver {
  constructor(private readonly activityService: ActivityService) {}

  @AdminOnly()
  @Mutation(() => Activity, {
    name: 'createActivity',
    description: 'Crear una nueva actividad académica',
  })
  createActivity(
    @Args('createActivityInput') createActivityInput: CreateActivityInput,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.activityService.create(createActivityInput, user.sub);
  }

  @AdminOnly()
  @Query(() => Activities, {
    name: 'findAllActivities',
    description:
      'Obtener lista de actividades académicas con paginación, ordenamiento, búsqueda y filtros',
  })
  findAll(@Args() activitiesArgs: ActivitiesArgs) {
    return this.activityService.findAll(
      activitiesArgs.page,
      activitiesArgs.pageSize,
      activitiesArgs.filters,
      activitiesArgs.orderBy,
      activitiesArgs.search,
    );
  }

  @Roles(Role.MEMBER, Role.SUPERADMIN)
  @Query(() => Activity, {
    name: 'findOneActivity',
    description:
      'Obtener una actividad académica por su ID para usuarios miembros',
  })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.activityService.findOne(id);
  }

  @AdminOnly()
  @Query(() => Activity, {
    name: 'findOneActivityForAdmin',
    description:
      'Obtener una actividad académica por su ID para administradores',
  })
  findOneForAdmin(@Args('id', { type: () => Int }) id: number) {
    return this.activityService.findOneForAdmin(id);
  }

  @Roles(Role.MEMBER, Role.SUPERADMIN)
  @Query(() => Activities, {
    name: 'getActivitiesFromWebsite',
    description:
      'Obtener actividades activas desde el sitio web con paginación, filtros y búsqueda',
  })
  getAcademicActivitiesFromWebsite(@Args() activitiesArgs: ActivitiesArgs) {
    return this.activityService.getActivitiesFromWebsite(
      activitiesArgs.page,
      activitiesArgs.pageSize,
      activitiesArgs.filters,
      activitiesArgs.orderBy,
      activitiesArgs.search,
    );
  }

  @AdminOnly()
  @Mutation(() => Activity, {
    name: 'updateActivity',
    description: 'Actualizar una actividad académica existente',
  })
  updateActivity(
    @Args('updateActivityInput') updateActivityInput: UpdateActivityInput,
  ) {
    return this.activityService.update(updateActivityInput);
  }

  @AdminOnly()
  @Mutation(() => Boolean, {
    name: 'changeStatusActivity',
    description: 'Cambiar el estado de una o más actividades académicas',
  })
  changeStatusActivity(
    @Args('ids', { type: () => [Int] }) ids: number[],
    @Args('status', { type: () => String }) status: Status,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.activityService.changeStatusActivity(ids, status, user.sub);
  }

  @AdminOnly()
  @Mutation(() => Boolean, {
    name: 'removeActivities',
    description: 'Eliminar una o más actividades académicas',
  })
  removeActivities(
    @Args('ids', { type: () => [Int] }) ids: number[],
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.activityService.remove(ids, user.sub);
  }

  @Roles(Role.MEMBER, Role.SUPERADMIN)
  @Query(() => [Activity], {
    name: 'getCalendarActivities',
    description:
      'Obtener actividades para mostrar en el calendario, filtrando por rango de fechas',
  })
  getCalendarActivities(
    @Args('startDate', { type: () => String }) startDate: string,
    @Args('endDate', { type: () => String }) endDate: string,
  ) {
    return this.activityService.findCalendarActivities(startDate, endDate);
  }
}
