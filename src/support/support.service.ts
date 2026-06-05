import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FileUpload } from 'graphql-upload-ts';
import { PrismaService } from 'src/db/prisma.service';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { NotificationService } from 'src/notification/notification.service';
import {
  MediaContext,
  Priority,
  Role,
  SupportStatus,
} from 'generated/prisma/enums';
import type { CloudinaryResponse } from 'src/cloudinary/types/cloudinary-response';
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

const MAX_ATTACHMENTS_PER_MESSAGE = 10;

const USER_SELECT = {
  id: true,
  name: true,
  paternalSurname: true,
  maternalSurname: true,
  memberCode: true,
} as const;

const MESSAGE_INCLUDE = {
  author: {
    select: {
      id: true,
      name: true,
      paternalSurname: true,
      maternalSurname: true,
      role: true,
    },
  },
  attachments: {
    orderBy: { order: 'asc' },
    include: { media: true },
  },
} as const;

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
    private notification: NotificationService,
    private cloudinary: CloudinaryService,
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

  async updateCategory(input: UpdateSupportCategoryInput) {
    const { id, ...data } = input;
    await this.findCategoryOrFail(id);
    return this.prisma.supportCategory.update({ where: { id }, data });
  }

  /**
   * Activa o desactiva una categoría sin eliminarla (los reclamos existentes
   * referencian categoryId y se rompería su lectura si la borráramos).
   */
  async setCategoryActive(id: number, isActive: boolean) {
    await this.findCategoryOrFail(id);
    return this.prisma.supportCategory.update({
      where: { id },
      data: { isActive },
    });
  }

  // ─── CREATE ───────────────────────────────────────────────────

  async create(
    userId: string,
    input: CreateSupportInput,
    files?: Promise<FileUpload>[],
  ) {
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

    const fileList = files ?? [];
    if (fileList.length > MAX_ATTACHMENTS_PER_MESSAGE) {
      throw new BadRequestException(
        `Máximo ${MAX_ATTACHMENTS_PER_MESSAGE} adjuntos en el reporte inicial`,
      );
    }

    // Si hay archivos, suben ANTES de crear el reclamo. Si crear el reclamo
    // falla, compensamos borrándolos para no dejar huérfanos.
    const uploaded = await this.uploadSupportFiles(fileList);

    let support: any; // prisma.support.create con include dinámico no infiere relaciones
    try {
      support = await this.prisma.support.create({
        data: {
          ...rest,
          userId,
          categoryId,
          subjectUserId,
          status: SupportStatus.PENDING,
          priority,
          dueDate,
          // Si el agremiado adjuntó evidencia al crear, registramos un primer
          // mensaje del propio agremiado con esos archivos. Sin archivos, el
          // hilo arranca vacío (los detalles viven en Support.details).
          ...(uploaded.mediaIds.length > 0 && {
            messages: {
              create: {
                authorId: userId,
                body: rest.details,
                isInternal: false,
                attachments: {
                  create: uploaded.mediaIds.map((mediaId, order) => ({
                    mediaId,
                    order,
                  })),
                },
              },
            },
          }),
        },
        include: {
          user: { select: USER_SELECT },
          category: true,
          subjectUser: { select: USER_SELECT },
          messages: { include: MESSAGE_INCLUDE, orderBy: { createdAt: 'asc' } },
        },
      });
    } catch (err) {
      await this.rollbackUploads(uploaded);
      throw err;
    }

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
    files?: Promise<FileUpload>[],
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

    const fileList = files ?? [];
    if (fileList.length > MAX_ATTACHMENTS_PER_MESSAGE) {
      throw new BadRequestException(
        `Máximo ${MAX_ATTACHMENTS_PER_MESSAGE} adjuntos por mensaje`,
      );
    }

    // Sube los archivos PRIMERO (fuera de la transacción de DB) y los registra
    // como Media con context=SUPPORT. Si luego falla la escritura del mensaje,
    // compensamos borrando los Cloudinary uploads para no dejar huérfanos.
    const uploaded = await this.uploadSupportFiles(fileList);

    try {
      const message = await this.prisma.supportMessage.create({
        data: {
          supportId,
          authorId,
          body,
          isInternal,
          ...(uploaded.mediaIds.length > 0 && {
            attachments: {
              create: uploaded.mediaIds.map((mediaId, order) => ({
                mediaId,
                order,
              })),
            },
          }),
        },
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
    } catch (err) {
      await this.rollbackUploads(uploaded);
      throw err;
    }
  }

  /**
   * Sube los archivos a Cloudinary y crea las filas Media (context=SUPPORT).
   * Si falla a mitad de camino, limpia lo ya subido antes de relanzar el error.
   */
  private async uploadSupportFiles(
    files: Promise<FileUpload>[],
  ): Promise<{ mediaIds: number[]; cloudinaryIds: string[] }> {
    const cloudinaryIds: string[] = [];
    const mediaIds: number[] = [];

    try {
      for (const filePromise of files) {
        const file = await filePromise;
        const cloud: CloudinaryResponse = await this.cloudinary.upload(
          file.createReadStream(),
          {
            folder: 'support',
            resource_type: 'auto',
            public_id: `support_${Date.now()}_${file.filename}`,
          },
        );
        cloudinaryIds.push(cloud.public_id as string);

        const media = await this.prisma.media.create({
          data: {
            title: file.filename,
            url: cloud.secure_url,
            publicId: cloud.public_id,
            resourceType: cloud.resource_type,
            type: cloud.format,
            bytes: cloud.bytes,
            width: cloud.width,
            height: cloud.height,
            format: cloud.format,
            context: MediaContext.SUPPORT,
          },
        });
        mediaIds.push(media.id);
      }
      return { mediaIds, cloudinaryIds };
    } catch (err) {
      await this.rollbackUploads({ mediaIds, cloudinaryIds });
      throw err;
    }
  }

  /** Limpia uploads parciales: borra filas Media y archivos en Cloudinary. */
  private async rollbackUploads(uploaded: {
    mediaIds: number[];
    cloudinaryIds: string[];
  }): Promise<void> {
    if (uploaded.mediaIds.length > 0) {
      await this.prisma.media
        .deleteMany({ where: { id: { in: uploaded.mediaIds } } })
        .catch((e) =>
          this.logger.warn(`No se pudo limpiar Media tras fallo: ${e}`),
        );
    }
    for (const publicId of uploaded.cloudinaryIds) {
      await this.cloudinary
        .delete(publicId)
        .catch((e) =>
          this.logger.warn(`No se pudo limpiar Cloudinary ${publicId}: ${e}`),
        );
    }
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
      where: {
        role: { in: [Role.ADMIN, Role.SUPERADMIN, Role.SUPPORT_AGENT] },
      },
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
