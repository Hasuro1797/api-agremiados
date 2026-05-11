import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  DiscountTargetType,
  DiscountType,
  Prisma,
  Status,
} from 'generated/prisma/client';
import { PrismaService } from 'src/db/prisma.service';
import { CreateQuotaDiscountInput } from './dto/create-quota-discount.input';
import { UpdateQuotaDiscountInput } from './dto/update-quota-discount.input';
import { QuotaDiscountFilterArgs } from './dto/quota-discount-filter.args';

const QUOTA_DISCOUNT_WHERE = {
  type: DiscountType.CUOTA,
  activityId: null,
} satisfies Prisma.DiscountWhereInput;

@Injectable()
export class QuotaDiscountService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(args: QuotaDiscountFilterArgs) {
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

    const where: Prisma.DiscountWhereInput = {
      ...QUOTA_DISCOUNT_WHERE,
      ...(filters?.status && { status: filters.status }),
      ...(search && {
        OR: [{ description: { contains: search, mode: 'insensitive' } }],
      }),
    };

    const [discounts, total] = await Promise.all([
      this.prisma.discount.findMany({
        where,
        include: { users: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [field]: order.toLowerCase() as Prisma.SortOrder },
      }),
      this.prisma.discount.count({ where }),
    ]);

    return {
      discounts,
      meta: { total, page, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async findOne(id: number) {
    const discount = await this.prisma.discount.findUnique({
      where: { id },
      include: { users: true },
    });
    if (!discount || discount.type !== DiscountType.CUOTA) {
      throw new NotFoundException(
        `Descuento de cuota con id "${id}" no encontrado`,
      );
    }
    return discount;
  }

  async create(input: CreateQuotaDiscountInput) {
    // debo poder crear un descuento para todos los usuarios o para usuarios específicos, pero no ambos a la vez
    const { userIds, applyToAllUsers, ...discountData } = input;

    return this.prisma.$transaction(async (tx) => {
      const discount = await tx.discount.create({
        data: {
          ...discountData,
          type: DiscountType.CUOTA,
          status: Status.ACTIVE,
          activityId: null,
          ...(applyToAllUsers
            ? {
                targetType: DiscountTargetType.ALL,
              }
            : { users: { create: userIds?.map((userId) => ({ userId })) } }),
        },
        include: { users: true },
      });
      return discount;
    });
  }

  async update(input: UpdateQuotaDiscountInput) {
    const { id, userIds, applyToAllUsers, ...discountData } = input;

    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      if (userIds !== undefined) {
        await tx.discountUser.deleteMany({ where: { discountId: id } });
        if (userIds.length > 0) {
          await tx.discountUser.createMany({
            data: userIds.map((userId) => ({ discountId: id, userId })),
          });
        }
      }
      const targetType = applyToAllUsers
        ? DiscountTargetType.ALL
        : DiscountTargetType.SPECIFIC_USERS;

      if (applyToAllUsers) {
        await tx.discountUser.deleteMany({ where: { discountId: id } });
      }

      const discount = await tx.discount.update({
        where: { id },
        data: {
          ...discountData,
          targetType,
        },
        include: { users: true },
      });
      return discount;
    });
  }

  async changeStatus(ids: number[], status: Status) {
    await this.prisma.discount.updateMany({
      where: { id: { in: ids }, ...QUOTA_DISCOUNT_WHERE },
      data: { status },
    });
    return true;
  }

  async remove(ids: number[]) {
    const result = await this.prisma.discount.deleteMany({
      where: { id: { in: ids }, ...QUOTA_DISCOUNT_WHERE },
    });
    if (result.count !== ids.length) {
      throw new BadRequestException(
        'Algunos descuentos no fueron encontrados y no se pudieron eliminar',
      );
    }
    return true;
  }
}
