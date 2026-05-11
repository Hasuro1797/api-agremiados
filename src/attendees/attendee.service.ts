import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import {
  ActivityAudience,
  AttendanceStatus,
  AttendeeType,
  Status,
} from 'generated/prisma/enums';
import { PrismaService } from 'src/db/prisma.service';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import { RegisterAttendeeInput } from './dto/register-attendee.input';
import { AddNonMemberInput } from './dto/add-non-member.input';
import { FiltersAttendeeInput } from './dto/filter-attendee.args';

const ATTENDEE_INCLUDE = {
  user: true,
  sponsoredGuests: true,
} satisfies Prisma.ActivityAttendeeInclude;

@Injectable()
export class AttendeeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  /** Registra un miembro (User) como asistente. */
  async register(input: RegisterAttendeeInput, adminUserId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: input.activityId },
    });
    if (!activity) throw new NotFoundException('Actividad no encontrada');
    if (activity.status !== Status.ACTIVE)
      throw new BadRequestException('La actividad no está activa');
    if (activity.stockUsed >= activity.stock)
      throw new BadRequestException('No hay cupos disponibles');

    const existing = await this.prisma.activityAttendee.findFirst({
      where: { userId: input.userId, activityId: input.activityId },
    });
    if (existing)
      throw new BadRequestException(
        'El usuario ya está registrado en esta actividad',
      );

    const [attendee] = await this.prisma.$transaction([
      this.prisma.activityAttendee.create({
        data: {
          userId: input.userId,
          activityId: input.activityId,
          attendeeType: AttendeeType.MEMBER,
          status: AttendanceStatus.ACEPTADO,
        },
        include: ATTENDEE_INCLUDE,
      }),
      this.prisma.activity.update({
        where: { id: input.activityId },
        data: { stockUsed: { increment: 1 } },
      }),
    ]);

    await this.auditLog.log({
      userId: adminUserId,
      action: 'CREATE',
      entity: 'activity_attendee',
      entityId: attendee.id,
      details: { activityId: input.activityId, memberId: input.userId },
    });

    return attendee;
  }

  /** Registra un invitado (INVITED) o externo (EXTERNAL) en una actividad. */
  async addNonMember(input: AddNonMemberInput, adminUserId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: input.activityId },
    });
    if (!activity) throw new NotFoundException('Actividad no encontrada');
    if (activity.status !== Status.ACTIVE)
      throw new BadRequestException('La actividad no está activa');

    if (input.attendeeType === AttendeeType.INVITED) {
      if (activity.audience === ActivityAudience.MEMBERS_ONLY)
        throw new BadRequestException('La actividad no admite invitados');

      const sponsor = await this.prisma.activityAttendee.findFirst({
        where: {
          id: input.sponsorAttendeeId,
          activityId: input.activityId,
          attendeeType: AttendeeType.MEMBER,
        },
        include: { sponsoredGuests: true },
      });
      if (!sponsor)
        throw new NotFoundException(
          'Asistente sponsor no encontrado en esta actividad',
        );

      const invitedCount = sponsor.sponsoredGuests.filter(
        (g) => g.attendeeType === AttendeeType.INVITED,
      ).length;
      if (invitedCount >= activity.guestStock)
        throw new BadRequestException(
          'Se alcanzó el límite de invitados para esta actividad',
        );
    }

    if (input.attendeeType === AttendeeType.EXTERNAL) {
      if (activity.audience !== ActivityAudience.OPEN)
        throw new BadRequestException(
          'La actividad no admite asistentes externos',
        );
    }

    const existing = await this.prisma.activityAttendee.findFirst({
      where: {
        documentNumber: input.documentNumber,
        activityId: input.activityId,
      },
    });
    if (existing)
      throw new BadRequestException(
        'Ya existe un asistente con ese documento en esta actividad',
      );

    const attendee = await this.prisma.activityAttendee.create({
      data: {
        activityId: input.activityId,
        attendeeType: input.attendeeType,
        documentType: input.documentType,
        documentNumber: input.documentNumber,
        name: input.name,
        lastname: input.lastname,
        email: input.email,
        phone: input.phone,
        sponsorAttendeeId:
          input.attendeeType === AttendeeType.INVITED
            ? input.sponsorAttendeeId
            : null,
        status: AttendanceStatus.ACEPTADO,
      },
      include: ATTENDEE_INCLUDE,
    });

    await this.auditLog.log({
      userId: adminUserId,
      action: 'CREATE',
      entity: 'activity_attendee',
      entityId: attendee.id,
      details: {
        activityId: input.activityId,
        attendeeType: input.attendeeType,
        documentNumber: input.documentNumber,
        sponsorAttendeeId: input.sponsorAttendeeId,
      },
    });

    return attendee;
  }

  async findAllByActivity(
    activityId: number,
    page: number,
    pageSize: number,
    filters: FiltersAttendeeInput | undefined,
    sort: string = 'createdAt-desc',
    search: string | undefined,
  ) {
    const validSortFields = ['createdAt', 'status', 'attendeeType', 'name'];
    const [field, order] = sort.split('-');
    if (
      !validSortFields.includes(field) ||
      !['asc', 'desc'].includes(order?.toLowerCase())
    ) {
      throw new BadRequestException(
        'Sort debe tener formato [campo]-[asc|desc]',
      );
    }

    const orderBy: Prisma.ActivityAttendeeOrderByWithRelationInput = {
      [field]: order.toLowerCase() as 'asc' | 'desc',
    };

    const where: Prisma.ActivityAttendeeWhereInput = {
      activityId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.attendeeType && { attendeeType: filters.attendeeType }),
      ...(search && {
        OR: [
          // Búsqueda en campos del miembro (User)
          { user: { name: { contains: search, mode: 'insensitive' } } },
          {
            user: {
              paternalSurname: { contains: search, mode: 'insensitive' },
            },
          },
          {
            user: {
              maternalSurname: { contains: search, mode: 'insensitive' },
            },
          },
          { user: { dni: { contains: search, mode: 'insensitive' } } },
          { user: { memberCode: { contains: search, mode: 'insensitive' } } },
          // Búsqueda en campos directos (invitado / externo)
          { name: { contains: search, mode: 'insensitive' } },
          { lastname: { contains: search, mode: 'insensitive' } },
          { documentNumber: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [attendees, total] = await this.prisma.$transaction([
      this.prisma.activityAttendee.findMany({
        where,
        orderBy,
        take: pageSize,
        skip: (page - 1) * pageSize,
        include: ATTENDEE_INCLUDE,
      }),
      this.prisma.activityAttendee.count({ where }),
    ]);

    return {
      attendees,
      meta: { total, page, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async confirmAttendance(attendeeId: string, adminUserId: string) {
    const attendee = await this.prisma.activityAttendee.findUnique({
      where: { id: attendeeId },
    });
    if (!attendee)
      throw new NotFoundException('Registro de asistencia no encontrado');

    const updated = await this.prisma.activityAttendee.update({
      where: { id: attendeeId },
      data: { attendanceConfirmed: true },
      include: ATTENDEE_INCLUDE,
    });

    await this.auditLog.log({
      userId: adminUserId,
      action: 'UPDATE',
      entity: 'activity_attendee',
      entityId: attendeeId,
      details: { field: 'attendanceConfirmed', to: true },
    });

    return updated;
  }

  async cancelAttendee(attendeeId: string, adminUserId: string) {
    const attendee = await this.prisma.activityAttendee.findUnique({
      where: { id: attendeeId },
      include: { activity: true },
    });
    if (!attendee)
      throw new NotFoundException('Registro de asistencia no encontrado');
    if (attendee.attendeeType !== AttendeeType.MEMBER) {
      throw new BadRequestException(
        'Use removeAttendee para cancelar invitados o externos',
      );
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.activityAttendee.update({
        where: { id: attendeeId },
        data: { status: AttendanceStatus.CANCELADO },
        include: ATTENDEE_INCLUDE,
      }),
      this.prisma.activity.update({
        where: { id: attendee.activityId },
        data: { stockUsed: { decrement: 1 } },
      }),
    ]);

    await this.auditLog.log({
      userId: adminUserId,
      action: 'UPDATE',
      entity: 'activity_attendee',
      entityId: attendeeId,
      details: { field: 'status', to: AttendanceStatus.CANCELADO },
    });

    return updated;
  }

  /** Elimina un asistente no-miembro (INVITED o EXTERNAL). */
  async removeAttendee(attendeeId: string, adminUserId: string) {
    const attendee = await this.prisma.activityAttendee.findUnique({
      where: { id: attendeeId },
    });
    if (!attendee) throw new NotFoundException('Asistente no encontrado');
    if (attendee.attendeeType === AttendeeType.MEMBER) {
      throw new BadRequestException(
        'Use cancelAttendee para miembros registrados',
      );
    }

    await this.prisma.activityAttendee.delete({ where: { id: attendeeId } });

    await this.auditLog.log({
      userId: adminUserId,
      action: 'DELETE',
      entity: 'activity_attendee',
      entityId: attendeeId,
      details: {
        activityId: attendee.activityId,
        attendeeType: attendee.attendeeType,
        sponsorAttendeeId: attendee.sponsorAttendeeId,
      },
    });

    return true;
  }

  /** Obtiene los invitados patrocinados por un asistente miembro. */
  async getSponsoredByAttendeeId(attendeeId: string) {
    const attendee = await this.prisma.activityAttendee.findUnique({
      where: { id: attendeeId },
      include: { sponsoredGuests: true },
    });
    if (!attendee)
      throw new NotFoundException('Registro de asistencia no encontrado');
    return attendee.sponsoredGuests;
  }
}
