import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/db/prisma.service';
import { CreateNotificationTemplateInput } from './dto/create-notification-template.input';
import { UpdateNotificationTemplateInput } from './dto/update-notification-template.input';
import { NotificationTemplateFilterArgs } from './dto/notification-template-filter.args';

@Injectable()
export class NotificationTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(args: NotificationTemplateFilterArgs) {
    const {
      page,
      pageSize,
      orderBy = 'createdAt-desc',
      search,
      filters,
    } = args;

    const regex = /^[a-zA-Z]+-(ASC|DESC|asc|desc)$/;
    if (!regex.test(orderBy)) {
      throw new BadRequestException(
        'El formato de orderBy debe ser "campo-ASC" o "campo-DESC"',
      );
    }
    const [field, order] = orderBy.split('-');

    const where: Prisma.NotificationTemplateWhereInput = {
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      ...(search && {
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [templates, total] = await Promise.all([
      this.prisma.notificationTemplate.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [field]: order.toLowerCase() as Prisma.SortOrder },
      }),
      this.prisma.notificationTemplate.count({ where }),
    ]);

    return {
      templates,
      meta: { total, page, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async findOne(id: number) {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });
    if (!template) {
      throw new NotFoundException(
        `Plantilla de notificación con id "${id}" no encontrada`,
      );
    }
    return template;
  }

  async create(input: CreateNotificationTemplateInput) {
    const existing = await this.prisma.notificationTemplate.findUnique({
      where: { code: input.code },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        `Ya existe una plantilla con el código "${input.code}"`,
      );
    }
    return this.prisma.notificationTemplate.create({ data: input });
  }

  async update(input: UpdateNotificationTemplateInput) {
    const { id, ...data } = input;
    await this.findOne(id);

    if (data.code) {
      const existing = await this.prisma.notificationTemplate.findFirst({
        where: { code: data.code, NOT: { id } },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException(
          `Ya existe una plantilla con el código "${data.code}"`,
        );
      }
    }

    return this.prisma.notificationTemplate.update({ where: { id }, data });
  }

  async toggle(id: number) {
    const template = await this.findOne(id);
    return this.prisma.notificationTemplate.update({
      where: { id },
      data: { isActive: !template.isActive },
    });
  }

  async delete(ids: number[]) {
    const templates = await this.findByIds(ids);
    if (templates.length === 0) {
      throw new NotFoundException(
        `No se encontraron plantillas con los IDs proporcionados`,
      );
    }

    await this.prisma.notificationTemplate.deleteMany({
      where: { id: { in: ids } },
    });
    return true;
  }

  private async findByIds(ids: number[]) {
    return this.prisma.notificationTemplate.findMany({
      where: { id: { in: ids } },
    });
  }
}
