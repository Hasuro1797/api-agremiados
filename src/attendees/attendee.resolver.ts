import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AdminOnly, EventsOnly } from 'src/auth';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { JwtPayloadWithAccess } from 'src/auth/types/jwt-payload.type';
import { AttendeeService } from './attendee.service';
import {
  RegisterAttendeeInput,
  AddNonMemberInput,
  FilterAttendeeArgs,
} from './dto';
import { AttendeeEntity, AttendeesResponse } from './entities/attendee.entity';

@Resolver()
export class AttendeeResolver {
  constructor(private readonly attendeeService: AttendeeService) {}

  @EventsOnly()
  @Mutation(() => AttendeeEntity, {
    name: 'registerAttendee',
    description: 'Registrar un agremiado como asistente de una actividad',
  })
  registerAttendee(
    @Args('input') input: RegisterAttendeeInput,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.attendeeService.register(input, user.sub);
  }

  @EventsOnly()
  @Mutation(() => AttendeeEntity, {
    name: 'addNonMemberAttendee',
    description:
      'Registrar un invitado (INVITED) o externo (EXTERNAL) en una actividad',
  })
  addNonMemberAttendee(
    @Args('input') input: AddNonMemberInput,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.attendeeService.addNonMember(input, user.sub);
  }

  @EventsOnly()
  @Query(() => AttendeesResponse, {
    name: 'findAttendeesByActivity',
    description:
      'Listar todos los asistentes de una actividad (miembros, invitados y externos)',
  })
  findAttendeesByActivity(@Args() args: FilterAttendeeArgs) {
    return this.attendeeService.findAllByActivity(
      args.activityId,
      args.page,
      args.pageSize,
      args.filters,
      args.orderBy,
      args.search,
    );
  }

  @EventsOnly()
  @Query(() => [AttendeeEntity], {
    name: 'getSponsoredByAttendeeId',
    description: 'Obtener invitados patrocinados por un asistente miembro',
  })
  getSponsoredByAttendeeId(
    @Args('attendeeId', { type: () => String }) attendeeId: string,
  ) {
    return this.attendeeService.getSponsoredByAttendeeId(attendeeId);
  }

  @EventsOnly()
  @Mutation(() => AttendeeEntity, {
    name: 'confirmAttendance',
    description: 'Confirmar la asistencia de un asistente (cualquier tipo)',
  })
  confirmAttendance(
    @Args('attendeeId', { type: () => String }) attendeeId: string,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.attendeeService.confirmAttendance(attendeeId, user.sub);
  }

  @EventsOnly()
  @Mutation(() => AttendeeEntity, {
    name: 'cancelAttendee',
    description: 'Cancelar el registro de un miembro y liberar cupo',
  })
  cancelAttendee(
    @Args('attendeeId', { type: () => String }) attendeeId: string,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.attendeeService.cancelAttendee(attendeeId, user.sub);
  }

  @AdminOnly()
  @Mutation(() => Boolean, {
    name: 'removeNonMemberAttendee',
    description: 'Eliminar un invitado o externo de una actividad',
  })
  removeNonMemberAttendee(
    @Args('attendeeId', { type: () => String }) attendeeId: string,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.attendeeService.removeAttendee(attendeeId, user.sub);
  }
}
