import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from 'generated/prisma/client';
import { MemberCategory, Role, UserStatus } from 'generated/prisma/enums';
import { PrismaService } from 'src/db/prisma.service';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import { QuotaService } from 'src/quotas/quota.service';
import { CreateMemberInput } from './dto/create-member.input';
import { UpdateMemberInput } from './dto/update-member.input';
import { FiltersMemberInput } from './dto/filter-member.args';

@Injectable()
export class MemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly quotaService: QuotaService,
  ) {}

  async create(input: CreateMemberInput, adminUserId: string) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(input.email ? [{ email: input.email }] : []),
          ...(input.dni ? [{ dni: input.dni }] : []),
          ...(input.memberCode ? [{ memberCode: input.memberCode }] : []),
        ],
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Ya existe un usuario con ese email, DNI o código de agremiado',
      );
    }

    const { password, memberCategory, ...rest } = input;
    const passwordHash = await bcrypt.hash(password, 10);

    const member = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          ...rest,
          password: passwordHash,
          role: Role.MEMBER,
          status: UserStatus.ACTIVE,
          memberCategory:
            (memberCategory as MemberCategory) ?? MemberCategory.REGULAR,
        },
      });

      // Asignar periodos de cuota activos al nuevo miembro
      await this.quotaService.assignActivePeriodsToMember(created.id, tx);

      return created;
    });

    await this.auditLog.log({
      userId: adminUserId,
      action: 'CREATE',
      entity: 'member',
      entityId: member.id,
      details: { name: member.name, email: member.email },
    });

    return member;
  }

  async findAll(
    page: number,
    pageSize: number,
    filters: FiltersMemberInput | undefined,
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

    const orderBy: Prisma.UserOrderByWithRelationInput = {
      [field]: order.toLowerCase() as 'asc' | 'desc',
    };

    const where: Prisma.UserWhereInput = {
      role: Role.MEMBER,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.memberCategory && {
        memberCategory: filters.memberCategory,
      }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { paternalSurname: { contains: search, mode: 'insensitive' } },
          { maternalSurname: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { dni: { contains: search, mode: 'insensitive' } },
          { memberCode: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [members, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy,
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    // Cargar resumen de cuotas en batch para todos los miembros
    const userIds = members.map((m) => m.id);
    const quotaSummaries =
      await this.quotaService.getQuotaSummaryBatch(userIds);

    const membersWithQuotas = members.map((m) => ({
      ...m,
      quotaSummary: quotaSummaries.get(m.id) ?? {
        totalPeriods: 0,
        pendingCount: 0,
        paidCount: 0,
        overdueCount: 0,
        totalOwed: 0,
        totalOverdue: 0,
      },
    }));

    return {
      members: membersWithQuotas,
      meta: {
        total,
        page,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(id: string) {
    const member = await this.prisma.user.findUnique({
      where: { id, role: Role.MEMBER },
    });
    if (!member) {
      throw new NotFoundException('Agremiado no encontrado');
    }

    const quotaSummary = await this.quotaService.getQuotaSummary(id);

    return { ...member, quotaSummary };
  }

  async update(input: UpdateMemberInput, adminUserId: string) {
    const member = await this.findOne(input.id);

    if (input.email && input.email !== member.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: input.email },
      });
      if (emailExists && emailExists.id !== input.id) {
        throw new BadRequestException('Email ya está en uso por otro usuario');
      }
    }

    const { id, password, memberCategory, ...rest } = input;

    const data: Prisma.UserUpdateInput = {
      ...rest,
      ...(password && { password: await bcrypt.hash(password, 10) }),
      ...(memberCategory && {
        memberCategory: memberCategory as MemberCategory,
      }),
    };

    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });

    await this.auditLog.log({
      userId: adminUserId,
      action: 'UPDATE',
      entity: 'member',
      entityId: id,
      details: { updatedFields: Object.keys(rest) },
    });

    return updated;
  }

  async remove(ids: string[], adminUserId: string) {
    const members = await this.prisma.user.findMany({
      where: { id: { in: ids }, role: Role.MEMBER },
    });
    if (members.length !== ids.length) {
      throw new BadRequestException('No se encontraron todos los agremiados');
    }

    await this.prisma.user.deleteMany({
      where: { id: { in: ids }, role: Role.MEMBER },
    });

    await this.auditLog.logMany(
      ids.map((id) => ({
        userId: adminUserId,
        action: 'DELETE',
        entity: 'member',
        entityId: id,
      })),
    );

    return true;
  }

  async changeStatus(ids: string[], status: UserStatus, adminUserId: string) {
    const members = await this.prisma.user.findMany({
      where: { id: { in: ids }, role: Role.MEMBER },
    });
    if (members.length !== ids.length) {
      throw new BadRequestException('No se encontraron todos los agremiados');
    }

    await this.prisma.user.updateMany({
      where: { id: { in: ids }, role: Role.MEMBER },
      data: { status },
    });

    await this.auditLog.logMany(
      ids.map((id) => ({
        userId: adminUserId,
        action: 'UPDATE',
        entity: 'member',
        entityId: id,
        details: { field: 'status', to: status },
      })),
    );

    return true;
  }

  async getStatusMember(userId: string) {
    const member = await this.prisma.user.findUnique({
      where: { id: userId, role: Role.MEMBER },
    });
    if (!member) {
      throw new NotFoundException('Agremiado no encontrado');
    }

    const today = new Date();
    const hasPaymentPerDay = await this.prisma.quotaPayment.findFirst({
      where: {
        userId,
        paidAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          lt: new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate() + 1,
          ),
        },
      },
    });

    return {
      status: member.status,
      hasPaymentPerDay: !!hasPaymentPerDay,
      hasRegistered: member.hasRegistered,
    };
  }
}
