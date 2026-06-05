import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, Status } from 'generated/prisma/client';
import { FileUpload } from 'graphql-upload-ts';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { PrismaService } from 'src/db/prisma.service';
import { NotificationService } from 'src/notification/notification.service';
import { TriggerKey, links } from 'src/notification/notification-catalog';
import { CreateAgreementInput } from './dto/create-agreement.input';
import { FiltersAgreementInput } from './dto/filters.args';
import { UpdateAgreementInput } from './dto/update-agreement.input';

@Injectable()
export class AgreementService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly cloudinary: CloudinaryService,
    private readonly notification: NotificationService,
  ) {}

  private async uploadCover(file: Promise<FileUpload>) {
    const resolvedFile = await file;
    const result = await this.cloudinary.upload(
      resolvedFile.createReadStream(),
      {
        folder: 'agreements/covers',
        resource_type: 'image',
        public_id: `agreement_cover_${Date.now()}_${resolvedFile.filename}`,
      },
    );
    return { url: result.secure_url, publicId: result.public_id };
  }

  async create(
    createAgreementInput: CreateAgreementInput,
    coverImageFile?: Promise<FileUpload>,
    adminUserId?: string,
  ) {
    const { content, tags, contactInfo, ...rest } = createAgreementInput;
    let coverImage: string | undefined;
    let coverImagePublicId: string | undefined;

    if (coverImageFile) {
      const uploaded = await this.uploadCover(coverImageFile);
      coverImage = uploaded.url;
      coverImagePublicId = uploaded.publicId;
    }

    const agreement = await this.prismaService.agreement.create({
      data: {
        ...rest,
        ...(coverImage && { coverImage, coverImagePublicId }),
        ...(content !== undefined && {
          content: content as Prisma.InputJsonValue,
        }),
        ...(tags !== undefined && { tags: tags as Prisma.InputJsonValue }),
        ...(contactInfo !== undefined && {
          contactInfo: contactInfo as unknown as Prisma.InputJsonValue,
        }),
      },
    });
    await this.auditLog.log({
      userId: adminUserId,
      action: 'CREATE',
      entity: 'agreement',
      entityId: String(agreement.id),
      details: {
        title: agreement.title,
        category: agreement.category,
      } as Prisma.InputJsonValue,
    });
    return agreement;
  }

  async findAll(
    page: number = 1,
    pageSize: number = 10,
    sort: string = 'createdAt-desc',
    search?: string,
    filters?: FiltersAgreementInput,
  ) {
    const regex = /^[a-zA-Z]+-(ASC|DESC|asc|desc)$/;
    if (sort && !regex.test(sort)) {
      throw new BadRequestException(
        'Sort must be in the format [field]-[ASC|DESC]',
      );
    }
    const [field, order] = sort.split('-');
    const orderBy: Prisma.AgreementOrderByWithRelationInput = {
      [field]: order.toLowerCase() === 'asc' ? 'asc' : 'desc',
    };
    const where: Prisma.AgreementWhereInput = {
      ...(search && { title: { contains: search, mode: 'insensitive' } }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.category && { category: filters.category }),
    };
    const [agreements, total] = await this.prismaService.$transaction([
      this.prismaService.agreement.findMany({
        where,
        orderBy,
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      this.prismaService.agreement.count({ where }),
    ]);
    return {
      agreements,
      meta: { total, page, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async findOne(id: number) {
    const agreement = await this.prismaService.agreement.findUnique({
      where: { id },
    });
    if (!agreement) throw new BadRequestException('Convenio no encontrado');
    return agreement;
  }

  async update(
    updateAgreementInput: UpdateAgreementInput,
    coverImageFile?: Promise<FileUpload>,
    adminUserId?: string,
  ) {
    const { id, content, tags, contactInfo, ...rest } = updateAgreementInput;
    const existing = await this.findOne(id);

    let coverImage: string | undefined;
    let coverImagePublicId: string | undefined;

    if (coverImageFile) {
      if (existing.coverImagePublicId) {
        await this.cloudinary.delete(existing.coverImagePublicId);
      }
      const uploaded = await this.uploadCover(coverImageFile);
      coverImage = uploaded.url;
      coverImagePublicId = uploaded.publicId;
    }

    const agreement = await this.prismaService.agreement.update({
      where: { id },
      data: {
        ...rest,
        ...(coverImage && { coverImage, coverImagePublicId }),
        ...(content !== undefined && {
          content: content as Prisma.InputJsonValue,
        }),
        ...(tags !== undefined && { tags: tags as Prisma.InputJsonValue }),
        ...(contactInfo !== undefined && {
          contactInfo: contactInfo as unknown as Prisma.InputJsonValue,
        }),
      },
    });
    await this.auditLog.log({
      userId: adminUserId,
      action: 'UPDATE',
      entity: 'agreement',
      entityId: String(id),
      details: rest as unknown as Prisma.InputJsonValue,
    });
    return agreement;
  }

  async remove(ids: number[], adminUserId?: string) {
    const found = await this.prismaService.agreement.findMany({
      where: { id: { in: ids } },
      select: { id: true, coverImagePublicId: true },
    });
    if (found.length !== ids.length) {
      throw new BadRequestException('Uno o más convenios no encontrados');
    }
    for (const agreement of found) {
      if (agreement.coverImagePublicId) {
        await this.cloudinary.delete(agreement.coverImagePublicId);
      }
    }
    await this.prismaService.agreement.deleteMany({
      where: { id: { in: ids } },
    });
    await this.auditLog.log({
      userId: adminUserId,
      action: 'DELETE',
      entity: 'agreement',
      details: { ids } as Prisma.InputJsonValue,
    });
    return true;
  }

  async changeStatusAgreement(
    ids: number[],
    status: Status,
    adminUserId?: string,
  ) {
    const newlyPublished =
      status === Status.ACTIVE
        ? await this.prismaService.agreement.findMany({
            where: { id: { in: ids }, status: { not: Status.ACTIVE } },
            select: { id: true, title: true },
          })
        : [];

    await this.prismaService.agreement.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
    await this.auditLog.log({
      userId: adminUserId,
      action: 'UPDATE',
      entity: 'agreement',
      details: { ids, status } as Prisma.InputJsonValue,
    });

    for (const agreement of newlyPublished) {
      void this.notification
        .broadcastToActiveMembers({
          templateCode: TriggerKey.AGREEMENT_PUBLISHED,
          triggerKey: TriggerKey.AGREEMENT_PUBLISHED,
          link: links.agreement(agreement.id),
          context: { title: agreement.title },
        })
        .catch(() => undefined);
    }

    return true;
  }

  async getAgreementsFromWebsite(page: number = 1, pageSize: number = 10) {
    const [agreements, total] = await this.prismaService.$transaction([
      this.prismaService.agreement.findMany({
        where: {
          status: Status.ACTIVE,
        },
        orderBy: { publishedAt: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      this.prismaService.agreement.count({
        where: {
          status: Status.ACTIVE,
        },
      }),
    ]);

    return {
      agreements,
      meta: { total, page, totalPages: Math.ceil(total / pageSize) },
    };
  }
}
