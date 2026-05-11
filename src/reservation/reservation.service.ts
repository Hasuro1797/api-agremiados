import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Prisma,
  ReservationRequestStatus,
  Status,
} from 'generated/prisma/client';
import { PrismaService } from 'src/db/prisma.service';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import { CreateReservationInput } from './dto/create-reservation.input';
import { UpdateReservationInput } from './dto/update-reservation.input';
import { FiltersReservationInput } from './dto/filters.args';
import { CreateReservationRequestInput } from './dto/create-reservation-request.input';
import { ReviewReservationRequestInput } from './dto/review-reservation-request.input';

const RESERVATION_WITH_IMAGES = {
  images: {
    orderBy: { order: Prisma.SortOrder.asc },
    include: { media: true },
  },
} satisfies Prisma.ReservationInclude;

@Injectable()
export class ReservationService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(
    createReservationInput: CreateReservationInput,
    adminUserId?: string,
  ) {
    const { mediaIds, amenities, rules, description, ...rest } =
      createReservationInput;
    return this.prismaService.$transaction(async (tx) => {
      const reservation = await tx.reservation.create({
        data: {
          ...rest,
          ...(description !== undefined && {
            description: description as Prisma.InputJsonValue,
          }),
          ...(amenities !== undefined && {
            amenities: amenities as Prisma.InputJsonValue,
          }),
          ...(rules !== undefined && { rules: rules as Prisma.InputJsonValue }),
          ...(mediaIds?.length && {
            images: {
              create: mediaIds.map((mediaId, index) => ({
                mediaId,
                order: index,
              })),
            },
          }),
        },
        include: RESERVATION_WITH_IMAGES,
      });
      await this.auditLog.log(
        {
          userId: adminUserId,
          action: 'CREATE',
          entity: 'reservation',
          entityId: String(reservation.id),
          details: { title: reservation.title } as Prisma.InputJsonValue,
        },
        tx,
      );
      return reservation;
    });
  }

  async findAll(
    page: number = 1,
    pageSize: number = 10,
    sort: string = 'createdAt-desc',
    search?: string,
    filters?: FiltersReservationInput,
  ) {
    const regex = /^[a-zA-Z]+-(ASC|DESC|asc|desc)$/;
    if (sort && !regex.test(sort)) {
      throw new BadRequestException(
        'Sort must be in the format [field]-[ASC|DESC]',
      );
    }
    const [field, order] = sort.split('-');
    const orderBy: Prisma.ReservationOrderByWithRelationInput = {
      [field]: order.toLowerCase() === 'asc' ? 'asc' : 'desc',
    };
    const where: Prisma.ReservationWhereInput = {
      ...(search && { title: { contains: search, mode: 'insensitive' } }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.spaceType && { spaceType: filters.spaceType }),
    };
    const [reservations, total] = await this.prismaService.$transaction([
      this.prismaService.reservation.findMany({
        where,
        orderBy,
        take: pageSize,
        skip: (page - 1) * pageSize,
        include: RESERVATION_WITH_IMAGES,
      }),
      this.prismaService.reservation.count({ where }),
    ]);
    return {
      reservations,
      meta: { total, page, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async findOne(id: number) {
    const reservation = await this.prismaService.reservation.findUnique({
      where: { id },
      include: RESERVATION_WITH_IMAGES,
    });
    if (!reservation)
      throw new BadRequestException(`Reserva con id ${id} no encontrada`);
    return reservation;
  }

  async findAllFromWeb() {
    return this.prismaService.reservation.findMany({
      where: { status: Status.ACTIVE },
      orderBy: { createdAt: 'desc' },
      include: RESERVATION_WITH_IMAGES,
    });
  }

  async update(
    updateReservationInput: UpdateReservationInput,
    adminUserId?: string,
  ) {
    const { id, mediaIds, amenities, rules, description, ...rest } =
      updateReservationInput;
    await this.findOne(id);
    return this.prismaService.$transaction(async (tx) => {
      const reservation = await tx.reservation.update({
        where: { id },
        data: {
          ...rest,
          ...(description !== undefined && {
            description: description as Prisma.InputJsonValue,
          }),
          ...(amenities !== undefined && {
            amenities: amenities as Prisma.InputJsonValue,
          }),
          ...(rules !== undefined && { rules: rules as Prisma.InputJsonValue }),
          ...(mediaIds !== undefined && {
            images: {
              deleteMany: {},
              create: mediaIds.map((mediaId, index) => ({
                mediaId,
                order: index,
              })),
            },
          }),
        },
        include: RESERVATION_WITH_IMAGES,
      });
      await this.auditLog.log(
        {
          userId: adminUserId,
          action: 'UPDATE',
          entity: 'reservation',
          entityId: String(id),
          details: rest as unknown as Prisma.InputJsonValue,
        },
        tx,
      );
      return reservation;
    });
  }

  async remove(ids: number[], adminUserId?: string) {
    const found = await this.prismaService.reservation.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    if (found.length !== ids.length) {
      throw new BadRequestException('Una o más reservas no encontradas');
    }

    const processedRequests = await this.prismaService.reservationRequest.count(
      {
        where: {
          reservationId: { in: ids },
          status: { not: ReservationRequestStatus.PENDIENTE },
        },
      },
    );

    if (processedRequests > 0) {
      throw new BadRequestException(
        'No se pueden eliminar reservas con solicitudes procesadas. Use cambio de estado en su lugar.',
      );
    }

    await this.prismaService.reservation.deleteMany({
      where: { id: { in: ids } },
    });
    await this.auditLog.log({
      userId: adminUserId,
      action: 'DELETE',
      entity: 'reservation',
      details: { ids } as Prisma.InputJsonValue,
    });
    return true;
  }

  async changeStatusReservation(
    ids: number[],
    status: Status,
    adminUserId?: string,
  ) {
    await this.prismaService.reservation.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
    await this.auditLog.log({
      userId: adminUserId,
      action: 'UPDATE',
      entity: 'reservation',
      details: { ids, status } as Prisma.InputJsonValue,
    });
    return true;
  }

  // ─── ReservationRequest ──────────────────────────────────────────────

  async createRequest(input: CreateReservationRequestInput, userId: string) {
    const reservation = await this.findOne(input.reservationId);
    if (reservation.status !== Status.ACTIVE) {
      throw new BadRequestException(
        'El espacio no está disponible para reservas',
      );
    }
    if (input.guestCount > reservation.capacity) {
      throw new BadRequestException(
        `El número de invitados (${input.guestCount}) supera la capacidad del espacio (${reservation.capacity})`,
      );
    }
    if (new Date(input.startDate) >= new Date(input.endDate)) {
      throw new BadRequestException(
        'La fecha de inicio debe ser anterior a la fecha de fin',
      );
    }
    const conflict = await this.prismaService.reservationRequest.findFirst({
      where: {
        reservationId: input.reservationId,
        status: ReservationRequestStatus.APROBADO,
        startDate: { lte: input.endDate },
        endDate: { gte: input.startDate },
      },
    });
    if (conflict) {
      throw new BadRequestException(
        'Ya existe una reserva aprobada para ese horario',
      );
    }
    let estimatedPrice: number | undefined;
    if (reservation.pricePerHour) {
      const hours =
        (new Date(input.endDate).getTime() -
          new Date(input.startDate).getTime()) /
        3_600_000;
      estimatedPrice = Math.ceil(hours * reservation.pricePerHour);
    } else if (reservation.price) {
      estimatedPrice = reservation.price;
    }
    return this.prismaService.reservationRequest.create({
      data: { ...input, userId, estimatedPrice },
      include: {
        reservation: { include: RESERVATION_WITH_IMAGES },
        user: {
          select: { id: true, name: true, paternalSurname: true, email: true },
        },
      },
    });
  }

  async findAllRequests(
    reservationId: number,
    page: number = 1,
    pageSize: number = 10,
    status?: ReservationRequestStatus,
  ) {
    const where = {
      reservationId,
      ...(status && { status }),
    };
    const [requests, total] = await this.prismaService.$transaction([
      this.prismaService.reservationRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              paternalSurname: true,
              email: true,
            },
          },
          reservation: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
      this.prismaService.reservationRequest.count({ where }),
    ]);
    return {
      requests,
      meta: { total, page, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async findAllRequestWithOutReservation(
    page: number = 1,
    pageSize: number = 10,
    status?: ReservationRequestStatus,
  ) {
    const where = {
      ...(status && { status }),
    };
    const [requests, total] = await this.prismaService.$transaction([
      this.prismaService.reservationRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
        include: {
          reservation: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
      this.prismaService.reservationRequest.count({ where }),
    ]);
    return {
      requests,
      meta: { total, page, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async findMyRequests(
    userId: string,
    page: number = 1,
    pageSize: number = 10,
  ) {
    const [requests, total] = await this.prismaService.$transaction([
      this.prismaService.reservationRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
        include: { reservation: { include: RESERVATION_WITH_IMAGES } },
      }),
      this.prismaService.reservationRequest.count({ where: { userId } }),
    ]);
    return {
      requests,
      meta: { total, page, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async reviewRequest(
    input: ReviewReservationRequestInput,
    adminUserId: string,
  ) {
    const request = await this.prismaService.reservationRequest.findUnique({
      where: { id: input.id },
    });
    if (!request) throw new BadRequestException('Solicitud no encontrada');
    if (request.status !== ReservationRequestStatus.PENDIENTE) {
      throw new BadRequestException(
        'Solo se pueden revisar solicitudes en estado PENDIENTE',
      );
    }
    const updated = await this.prismaService.reservationRequest.update({
      where: { id: input.id },
      data: {
        status: input.status,
        adminComment: input.adminComment,
        reviewedAt: new Date(),
        reviewedBy: adminUserId,
      },
    });
    await this.auditLog.log({
      userId: adminUserId,
      action: 'UPDATE',
      entity: 'reservation_request',
      entityId: input.id,
      details: {
        status: input.status,
        adminComment: input.adminComment,
      } as Prisma.InputJsonValue,
    });
    return updated;
  }

  async cancelRequest(id: string, userId: string) {
    const request = await this.prismaService.reservationRequest.findUnique({
      where: { id },
    });
    if (!request) throw new BadRequestException('Solicitud no encontrada');
    if (request.userId !== userId) {
      throw new BadRequestException(
        'No tienes permiso para cancelar esta solicitud',
      );
    }
    if (request.status === ReservationRequestStatus.APROBADO) {
      throw new BadRequestException(
        'No puedes cancelar una solicitud ya aprobada. Contáctate con el administrador.',
      );
    }
    return this.prismaService.reservationRequest.update({
      where: { id },
      data: { status: ReservationRequestStatus.CANCELADO },
    });
  }
}
