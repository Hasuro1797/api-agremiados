import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import { NotificationService } from 'src/notification/notification.service';
import { Priority, Role, SupportStatus } from 'generated/prisma/enums';
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

const USER_SELECT = {
  id: true,
  name: true,
  paternalSurname: true,
  maternalSurname: true,
  memberCode: true,
} as const;

const MESSAGE_INCLUDE = {
  author: {
    select: { id: true, name: true, paternalSurname: true, role: true },
  },
} as const;

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
    private notification: NotificationService,
  ) {}

  // ─── CATEGORIES ───────────────────────────────────────────────

  async getCategories() {
    return this.prisma.supportCategory.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
  }

  async createCategory(input: CreateSupportCategoryInput) {
    return this.prisma.supportCategory.create({ data: input });
  }

  async updateCategory(id: number, input: Partial<CreateSupportCategoryInput>) {
    await this.findCategoryOrFail(id);
    return this.prisma.supportCategory.update({ where: { id }, data: input });
  }

  // ─── CREATE ───────────────────────────────────────────────────

  async create(userId: string, input: CreateSupportInput) {
    const { categoryId, subjectUserId, ...rest } = input;

    let dueDate: Date | undefined;
    let priority: Priority = Priority.MEDIUM;

    if (categoryId) {
      const category = await this.prisma.supportCategory.findUnique({
        where: { id: categoryId },
      });
      if (category) {
        priority = category.defaultPriority;
        if (category.slaDays) {
          dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + category.slaDays);
        }
      }
    }

    if (subjectUserId) {
      const exists = await this.prisma.user.findUnique({
        where: { id: subjectUserId },
        select: { id: true },
      });
      if (!exists) throw new NotFoundException('Usuario sujeto no encontrado');
    }

    const support = await this.prisma.support.create({
      data: {
        ...rest,
        userId,
        categoryId,
        subjectUserId,
        status: SupportStatus.PENDING,
        priority,
        dueDate,
      },
      include: {
        user: { select: USER_SELECT },
        category: true,
        subjectUser: { select: USER_SELECT },
        messages: { include: MESSAGE_INCLUDE },
      },
    });

    await this.auditLog.log({
      userId,
      action: 'CREATE',
      entity: 'support',
      entityId: String(support.id),
      details: { topic: support.topic, categoryId },
    });

    void this.notifyAdmins('SUPPORT_CREATED', {
      topic: support.topic,
      supportId: support.id,
      memberName: support.user.name,
    });

    return support;
  }

  // ─── QUERIES ──────────────────────────────────────────────────

  async findAll(filters: SupportFiltersArgs) {
    const {
      status,
      priority,
      categoryId,
      search,
      page = 1,
      pageSize = 20,
    } = filters;
    const skip = (page - 1) * pageSize;

    const where = {
      ...(status && { status }),
      ...(priority && { priority }),
      ...(categoryId && { categoryId }),
      ...(search && {
        OR: [
          { topic: { contains: search, mode: 'insensitive' as const } },
          { details: { contains: search, mode: 'insensitive' as const } },
          {
            user: { name: { contains: search, mode: 'insensitive' as const } },
          },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.support.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [
          { status: 'asc' },
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          user: { select: USER_SELECT },
          category: true,
          subjectUser: { select: USER_SELECT },
          messages: { include: MESSAGE_INCLUDE, orderBy: { createdAt: 'asc' } },
        },
      }),
      this.prisma.support.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findMine(userId: string, filters: SupportFiltersArgs) {
    const { status, page = 1, pageSize = 20 } = filters;
    const skip = (page - 1) * pageSize;

    const where = {
      userId,
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.support.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: USER_SELECT },
          category: true,
          subjectUser: { select: USER_SELECT },
          messages: {
            where: { isInternal: false },
            include: MESSAGE_INCLUDE,
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      this.prisma.support.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(id: number, requesterId: string, requesterRole: Role) {
    const support = await this.prisma.support.findUnique({
      where: { id },
      include: {
        user: { select: USER_SELECT },
        category: true,
        subjectUser: { select: USER_SELECT },
        messages: {
          where: requesterRole === Role.MEMBER ? { isInternal: false } : {},
          include: MESSAGE_INCLUDE,
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!support) throw new NotFoundException('Reclamo no encontrado');

    if (requesterRole === Role.MEMBER && support.userId !== requesterId) {
      throw new ForbiddenException('No tienes acceso a este reclamo');
    }

    return support;
  }

  // ─── MESSAGES ─────────────────────────────────────────────────

  async addMessage(
    authorId: string,
    authorRole: Role,
    input: CreateSupportMessageInput,
  ) {
    const { supportId, body, isInternal = false } = input;

    const support = await this.findSupportOrFail(supportId);

    if (requesterIsBlocked(support.status)) {
      throw new BadRequestException(
        'No se pueden agregar mensajes a un reclamo cerrado o rechazado',
      );
    }

    if (authorRole === Role.MEMBER && support.userId !== authorId) {
      throw new ForbiddenException('No tienes acceso a este reclamo');
    }

    if (authorRole === Role.MEMBER && isInternal) {
      throw new ForbiddenException(
        'Los agremiados no pueden crear notas internas',
      );
    }

    const message = await this.prisma.supportMessage.create({
      data: { supportId, authorId, body, isInternal },
      include: MESSAGE_INCLUDE,
    });

    // Marca primera respuesta del admin
    if (authorRole !== Role.MEMBER && !support.respondedAt) {
      await this.prisma.support.update({
        where: { id: supportId },
        data: { respondedAt: new Date() },
      });
    }

    return message;
  }

  // ─── WORKFLOW ─────────────────────────────────────────────────

  async assign(adminId: string, input: AssignSupportInput) {
    const { supportId, assignedTo, assignedName, dueDate, priority } = input;
    const support = await this.findSupportOrFail(supportId);

    if (support.status === SupportStatus.CLOSED) {
      throw new BadRequestException('No se puede asignar un reclamo cerrado');
    }

    const updated = await this.prisma.support.update({
      where: { id: supportId },
      data: {
        assignedTo,
        assignedName,
        status: SupportStatus.IN_PROGRESS,
        ...(dueDate && { dueDate }),
        ...(priority && { priority }),
      },
      include: {
        user: { select: USER_SELECT },
        category: true,
        subjectUser: { select: USER_SELECT },
        messages: { include: MESSAGE_INCLUDE, orderBy: { createdAt: 'asc' } },
      },
    });

    await this.auditLog.log({
      userId: adminId,
      action: 'UPDATE',
      entity: 'support',
      entityId: String(supportId),
      details: {
        action: 'assign',
        assignedTo,
        from: support.status,
        to: SupportStatus.IN_PROGRESS,
      },
    });

    void this.notification.notify({
      userId: support.userId,
      templateCode: 'SUPPORT_ASSIGNED',
      triggerKey: 'SUPPORT_ASSIGNED',
      context: {
        topic: support.topic,
        supportId,
        assignedName: assignedName ?? '',
      },
    });

    return updated;
  }

  async resolve(adminId: string, input: ResolveSupportInput) {
    const { supportId, resolutionBody } = input;
    const support = await this.findSupportOrFail(supportId);

    if (
      support.status === SupportStatus.CLOSED ||
      support.status === SupportStatus.RESOLVED
    ) {
      throw new BadRequestException('El reclamo ya está resuelto o cerrado');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.support.update({
        where: { id: supportId },
        data: {
          status: SupportStatus.RESOLVED,
          resolvedAt: new Date(),
          resolvedBy: adminId,
        },
        include: {
          user: { select: USER_SELECT },
          category: true,
          subjectUser: { select: USER_SELECT },
          messages: { include: MESSAGE_INCLUDE, orderBy: { createdAt: 'asc' } },
        },
      }),
      this.prisma.supportMessage.create({
        data: {
          supportId,
          authorId: adminId,
          body: resolutionBody,
          isInternal: false,
        },
      }),
    ]);

    await this.auditLog.log({
      userId: adminId,
      action: 'UPDATE',
      entity: 'support',
      entityId: String(supportId),
      details: { action: 'resolve', from: support.status },
    });

    void this.notification.notify({
      userId: support.userId,
      templateCode: 'SUPPORT_RESOLVED',
      triggerKey: 'SUPPORT_RESOLVED',
      context: { topic: support.topic, supportId },
    });

    return updated;
  }

  async reject(adminId: string, input: RejectSupportInput) {
    const { supportId, rejectReason } = input;
    const support = await this.findSupportOrFail(supportId);

    if (
      support.status === SupportStatus.CLOSED ||
      support.status === SupportStatus.REJECTED
    ) {
      throw new BadRequestException('El reclamo ya está rechazado o cerrado');
    }

    const updated = await this.prisma.support.update({
      where: { id: supportId },
      data: {
        status: SupportStatus.REJECTED,
        rejectReason,
        resolvedAt: new Date(),
        resolvedBy: adminId,
      },
      include: {
        user: { select: USER_SELECT },
        category: true,
        subjectUser: { select: USER_SELECT },
        messages: { include: MESSAGE_INCLUDE, orderBy: { createdAt: 'asc' } },
      },
    });

    await this.auditLog.log({
      userId: adminId,
      action: 'UPDATE',
      entity: 'support',
      entityId: String(supportId),
      details: { action: 'reject', reason: rejectReason },
    });

    void this.notification.notify({
      userId: support.userId,
      templateCode: 'SUPPORT_REJECTED',
      triggerKey: 'SUPPORT_REJECTED',
      context: { topic: support.topic, supportId, rejectReason },
    });

    return updated;
  }

  async close(adminId: string, supportId: number) {
    const support = await this.findSupportOrFail(supportId);

    if (support.status !== SupportStatus.RESOLVED) {
      throw new BadRequestException('Solo se pueden cerrar reclamos resueltos');
    }

    return this.prisma.support.update({
      where: { id: supportId },
      data: { status: SupportStatus.CLOSED },
      include: {
        user: { select: USER_SELECT },
        category: true,
        subjectUser: { select: USER_SELECT },
        messages: { include: MESSAGE_INCLUDE, orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async reopen(userId: string, input: ReopenSupportInput) {
    const { supportId, reopenReason } = input;
    const support = await this.findSupportOrFail(supportId);

    if (support.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a este reclamo');
    }

    if (
      support.status !== SupportStatus.RESOLVED &&
      support.status !== SupportStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Solo se pueden reabrir reclamos resueltos o rechazados',
      );
    }

    const updated = await this.prisma.support.update({
      where: { id: supportId },
      data: {
        status: SupportStatus.REOPENED,
        reopenedAt: new Date(),
        reopenReason,
        resolvedAt: null,
        resolvedBy: null,
        rejectReason: null,
        overdueNotifiedAt: null,
      },
      include: {
        user: { select: USER_SELECT },
        category: true,
        subjectUser: { select: USER_SELECT },
        messages: { include: MESSAGE_INCLUDE, orderBy: { createdAt: 'asc' } },
      },
    });

    await this.auditLog.log({
      userId,
      action: 'UPDATE',
      entity: 'support',
      entityId: String(supportId),
      details: { action: 'reopen', reason: reopenReason },
    });

    void this.notifyAdmins('SUPPORT_REOPENED', {
      topic: support.topic,
      supportId,
      reopenReason: reopenReason ?? '',
    });

    return updated;
  }

  async rate(userId: string, input: RateSupportInput) {
    const { supportId, rating, comment } = input;
    const support = await this.findSupportOrFail(supportId);

    if (support.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a este reclamo');
    }

    if (support.status !== SupportStatus.RESOLVED) {
      throw new BadRequestException('Solo puedes calificar reclamos resueltos');
    }

    if (support.satisfactionRating !== null) {
      throw new BadRequestException('Este reclamo ya fue calificado');
    }

    return this.prisma.support.update({
      where: { id: supportId },
      data: {
        satisfactionRating: rating,
        satisfactionComment: comment,
      },
      include: {
        user: { select: USER_SELECT },
        category: true,
        subjectUser: { select: USER_SELECT },
        messages: { include: MESSAGE_INCLUDE, orderBy: { createdAt: 'asc' } },
      },
    });
  }

  // ─── OVERDUE (usado por la tarea cron) ────────────────────────

  async findOverdue() {
    return this.prisma.support.findMany({
      where: {
        status: SupportStatus.IN_PROGRESS,
        dueDate: { lt: new Date() },
        overdueNotifiedAt: null,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async markOverdueNotified(ids: number[]) {
    await this.prisma.support.updateMany({
      where: { id: { in: ids } },
      data: { overdueNotifiedAt: new Date() },
    });
  }

  // ─── HELPERS ──────────────────────────────────────────────────

  private async findSupportOrFail(id: number) {
    const support = await this.prisma.support.findUnique({ where: { id } });
    if (!support) throw new NotFoundException('Reclamo no encontrado');
    return support;
  }

  private async findCategoryOrFail(id: number) {
    const cat = await this.prisma.supportCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Categoría no encontrada');
    return cat;
  }

  private async notifyAdmins(
    templateCode: string,
    context: Record<string, string | number>,
  ): Promise<void> {
    const admins = await this.prisma.user.findMany({
      where: { role: { in: [Role.ADMIN, Role.SUPERADMIN, Role.MODERATOR] } },
      select: { id: true },
    });
    await this.notification.notifyMany(
      admins.map((a) => a.id),
      templateCode,
      context,
      templateCode,
    );
  }
}

function requesterIsBlocked(status: SupportStatus): boolean {
  return status === SupportStatus.CLOSED || status === SupportStatus.REJECTED;
}
