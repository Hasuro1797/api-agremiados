import { BadRequestException, Injectable } from '@nestjs/common';
import {
  DiscountTargetType,
  DiscountType,
  Prisma,
  Status,
} from 'generated/prisma/client';
import { PrismaService } from 'src/db/prisma.service';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import { NotificationService } from 'src/notification/notification.service';
import { TriggerKey, links } from 'src/notification/notification-catalog';
import { FiltersActivityInput } from './dto';
import { CreateActivityInput } from './dto/create-activity.input';
import { UpdateActivityInput } from './dto/update-academic.input';

/** Reutilizable: incluye imágenes y descuentos activos. */
const ACTIVITY_WITH_IMAGES = {
  images: {
    orderBy: { order: Prisma.SortOrder.asc },
    include: { media: true },
  },
} satisfies Prisma.ActivityInclude;

const ACTIVITY_WITH_IMAGES_AND_DISCOUNTS = {
  ...ACTIVITY_WITH_IMAGES,
  discounts: {
    where: { status: Status.ACTIVE, endDate: { gte: new Date() } },
  },
} satisfies Prisma.ActivityInclude;

@Injectable()
export class ActivityService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly notification: NotificationService,
  ) {}

  async create(createActivityInput: CreateActivityInput, userId?: string) {
    const {
      imagesIds,
      hasDiscount,
      percentDiscount,
      rangeDiscountDates,
      days,
      ...activityData
    } = createActivityInput;

    return this.prismaService.$transaction(async (tx) => {
      const activity = await tx.activity.create({
        data: {
          ...activityData,
          ...(days !== undefined && { days: days as Prisma.InputJsonValue }),

          ...(imagesIds?.length && {
            images: {
              create: imagesIds.map((mediaId, index) => ({
                mediaId,
                order: index,
              })),
            },
          }),
          ...(hasDiscount &&
            percentDiscount !== undefined &&
            rangeDiscountDates && {
              discounts: {
                create: {
                  description: `Descuento actividad`,
                  percentage: percentDiscount,
                  startDate: rangeDiscountDates.from,
                  endDate: rangeDiscountDates.to,
                  type: DiscountType.EVENTO,
                  status: Status.ACTIVE,
                  targetType: DiscountTargetType.ALL,
                },
              },
            }),
        },
        include: ACTIVITY_WITH_IMAGES_AND_DISCOUNTS,
      });

      await this.auditLog.log(
        {
          userId,
          action: 'CREATE',
          entity: 'activity',
          entityId: String(activity.id),
          details: { title: activity.title },
        },
        tx,
      );

      return activity;
    });
  }

  async findAll(
    page: number = 1,
    pageSize: number = 10,
    filters: FiltersActivityInput | undefined,
    sort: string = 'createdAt-desc',
    search: string | undefined,
  ) {
    const regex = /^[a-zA-Z]+-(ASC|DESC|asc|desc)$/;
    if (sort && !regex.test(sort)) {
      throw new BadRequestException(
        'Sort must be in the format [field]-[ASC|DESC]',
      );
    }
    const [field, order] = sort.split('-');

    const orderBy: Prisma.ActivityOrderByWithRelationInput = {
      [field]: order.toLowerCase() === 'asc' ? 'asc' : 'desc',
    };

    const where: Prisma.ActivityWhereInput = {
      ...(filters?.startDate && { date: { gte: filters.startDate } }),
      ...(filters?.endDate && { date: { lte: filters.endDate } }),
      ...(filters?.hasPrice !== undefined && { hasPrice: filters.hasPrice }),
      ...(filters?.type && { type: filters.type }),
      ...(filters?.status && { status: filters.status }),
      ...(search && {
        title: { contains: search, mode: 'insensitive' },
      }),
    };

    const [activities, total] = await this.prismaService.$transaction([
      this.prismaService.activity.findMany({
        where,
        orderBy,
        take: pageSize,
        skip: (page - 1) * pageSize,
        include: ACTIVITY_WITH_IMAGES,
      }),
      this.prismaService.activity.count({ where }),
    ]);

    console.log('Activities found:', activities?.[0], 'Total matching:', total);

    return {
      activities,
      meta: {
        total,
        page,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(id: number) {
    const activity = await this.prismaService.activity.findUnique({
      where: { id },
      include: ACTIVITY_WITH_IMAGES_AND_DISCOUNTS,
    });
    if (!activity) {
      throw new BadRequestException('Actividad no encontrada');
    }
    console.log(activity);
    return activity;
  }

  async findOneForAdmin(id: number) {
    const activity = await this.prismaService.activity.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { order: Prisma.SortOrder.asc },
          include: { media: true },
        },
        discounts: true,
        attendees: {
          include: { user: true, sponsoredGuests: true },
        },
      },
    });
    if (!activity) {
      throw new BadRequestException('Actividad no encontrada');
    }
    console.log(activity);
    return activity;
  }

  async update(updateActivityInput: UpdateActivityInput) {
    const {
      imagesIds,
      id: activityId,
      hasDiscount,
      percentDiscount,
      rangeDiscountDates,
      days,
      ...activityData
    } = updateActivityInput;

    await this.findOne(activityId);

    return this.prismaService.$transaction(async (tx) => {
      // Actualizar campos escalares de la actividad
      await tx.activity.update({
        where: { id: activityId },
        data: {
          ...activityData,
          ...(days !== undefined && { days: days as Prisma.InputJsonValue }),
        },
      });

      // Reemplazar imágenes si se envían
      if (imagesIds !== undefined) {
        await tx.activityMedia.deleteMany({
          where: { activityId },
        });
        if (imagesIds.length > 0) {
          await tx.activityMedia.createMany({
            data: imagesIds.map((mediaId, index) => ({
              activityId,
              mediaId,
              order: index,
            })),
          });
        }
      }

      // Manejar descuento
      if (hasDiscount === false) {
        // Eliminar descuentos existentes de tipo EVENTO
        await tx.discount.deleteMany({
          where: { activityId, type: DiscountType.EVENTO },
        });
      } else if (
        hasDiscount === true &&
        percentDiscount !== undefined &&
        rangeDiscountDates
      ) {
        const existingDiscount = await tx.discount.findFirst({
          where: { activityId, type: DiscountType.EVENTO },
        });
        if (existingDiscount) {
          await tx.discount.update({
            where: { id: existingDiscount.id },
            data: {
              percentage: percentDiscount,
              startDate: rangeDiscountDates.from,
              endDate: rangeDiscountDates.to,
              status: Status.ACTIVE,
              targetType: DiscountTargetType.ALL,
            },
          });
        } else {
          await tx.discount.create({
            data: {
              description: `Descuento actividad`,
              percentage: percentDiscount,
              startDate: rangeDiscountDates.from,
              endDate: rangeDiscountDates.to,
              type: DiscountType.EVENTO,
              status: Status.ACTIVE,
              activityId,
              targetType: DiscountTargetType.ALL,
            },
          });
        }
      }

      return tx.activity.findUnique({
        where: { id: activityId },
        include: ACTIVITY_WITH_IMAGES_AND_DISCOUNTS,
      });
    });
  }

  async remove(ids: number[], userId?: string) {
    const activities = await this.prismaService.activity.findMany({
      where: { id: { in: ids } },
      include: {
        attendees: { take: 1 },
        certificates: { take: 1 },
      },
    });

    if (activities.length !== ids.length) {
      throw new BadRequestException('No se encontraron todas las actividades');
    }

    const hasAttendees = activities.some((a) => a.attendees.length > 0);
    const hasCertificates = activities.some((a) => a.certificates.length > 0);
    const invoiceCount = await this.prismaService.invoiceHeader.count({
      where: {
        details: {
          some: {
            itemType: 'ACTIVITY_ATTENDEE',
            itemId: { in: ids.map(String) },
          },
        },
      },
    });

    if (hasAttendees || hasCertificates || invoiceCount > 0) {
      throw new BadRequestException(
        'No se pueden eliminar actividades con asistentes, certificados o facturas asociadas. Use cambio de estado en su lugar.',
      );
    }

    await this.prismaService.activity.deleteMany({
      where: { id: { in: ids } },
    });

    await this.auditLog.logMany(
      ids.map((id) => ({
        userId,
        action: 'DELETE',
        entity: 'activity',
        entityId: String(id),
      })),
    );

    return true;
  }

  async changeStatusActivity(ids: number[], status: Status, userId?: string) {
    console.log('IDs a cambiar estado:', ids, 'Nuevo estado:', status);
    // Solo notificamos las que pasan de NO publicadas a ACTIVE (evita reenvíos).
    const newlyPublished =
      status === Status.ACTIVE
        ? await this.prismaService.activity.findMany({
            where: { id: { in: ids }, status: { not: Status.ACTIVE } },
            select: { id: true, title: true, date: true, venue: true },
          })
        : [];

    await this.prismaService.activity.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
    await this.auditLog.logMany(
      ids.map((id) => ({
        userId,
        action: 'UPDATE',
        entity: 'activity',
        entityId: String(id),
        details: { field: 'status', to: status },
      })),
    );

    // Aviso in-app masivo por cada actividad recién publicada.
    for (const activity of newlyPublished) {
      void this.notification
        .broadcastToActiveMembers({
          templateCode: TriggerKey.ACTIVITY_CREATED,
          triggerKey: TriggerKey.ACTIVITY_CREATED,
          link: links.activity(activity.id),
          context: {
            title: activity.title,
            date: activity.date.toLocaleDateString('es-PE'),
            place: activity.venue ?? 'Por confirmar',
          },
        })
        .catch(() => undefined);
    }

    return true;
  }

  async getActivitiesFromWebsite(
    page: number = 1,
    pageSize: number = 10,
    filters: FiltersActivityInput | undefined,
    sort: string = 'date-asc',
    search: string | undefined,
  ) {
    const regex = /^[a-zA-Z]+-(ASC|DESC|asc|desc)$/;
    if (sort && !regex.test(sort)) {
      throw new BadRequestException(
        'Sort must be in the format [field]-[ASC|DESC]',
      );
    }
    const [field, order] = sort.split('-');

    const orderBy: Prisma.ActivityOrderByWithRelationInput = {
      [field]: order.toLowerCase() === 'asc' ? 'asc' : 'desc',
    };

    const where: Prisma.ActivityWhereInput = {
      status: Status.ACTIVE,
      OR: [{ date: { gte: new Date() } }, { finishDate: { gte: new Date() } }],
      ...(filters?.hasPrice !== undefined && { hasPrice: filters.hasPrice }),
      ...(filters?.type && { type: filters.type }),
      ...(filters?.startDate && { date: { gte: filters.startDate } }),
      ...(filters?.endDate && { date: { lte: filters.endDate } }),
      ...(search && { title: { contains: search, mode: 'insensitive' } }),
    };

    const [activities, total] = await this.prismaService.$transaction([
      this.prismaService.activity.findMany({
        where,
        orderBy,
        take: pageSize,
        skip: (page - 1) * pageSize,
        include: ACTIVITY_WITH_IMAGES_AND_DISCOUNTS,
      }),
      this.prismaService.activity.count({ where }),
    ]);

    return {
      activities,
      meta: {
        total,
        page,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findByIds(ids: number[]) {
    return this.prismaService.activity.findMany({
      where: { id: { in: ids } },
    });
  }

  async findCalendarActivities(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return this.prismaService.activity.findMany({
      where: {
        status: Status.ACTIVE,
        OR: [
          { date: { gte: start, lte: end } },
          { finishDate: { gte: start, lte: end } },
        ],
      },
      orderBy: { date: Prisma.SortOrder.asc },
      include: ACTIVITY_WITH_IMAGES_AND_DISCOUNTS,
    });
  }
}
