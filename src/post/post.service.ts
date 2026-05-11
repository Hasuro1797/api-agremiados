import { BadRequestException, Injectable } from '@nestjs/common';
import { PostType, Prisma, Status } from 'generated/prisma/client';
import { FileUpload } from 'graphql-upload-ts';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { PrismaService } from 'src/db/prisma.service';
import { CreatePostInput } from './dto/create-post.input';
import { FiltersPostInput } from './dto/filters.arg';
import { UpdatePostInput } from './dto/update-post.input';

@Injectable()
export class PostService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  private async uploadCover(file: Promise<FileUpload>) {
    const resolvedFile = await file;
    const result = await this.cloudinary.upload(
      resolvedFile.createReadStream(),
      {
        folder: 'posts/covers',
        resource_type: 'image',
        public_id: `post_cover_${Date.now()}_${resolvedFile.filename}`,
      },
    );
    return { url: result.secure_url, publicId: result.public_id };
  }

  async create(
    createPostInput: CreatePostInput,
    coverImageFile?: Promise<FileUpload>,
    adminUserId?: string,
  ) {
    const { content, tags, ...rest } = createPostInput;
    let coverImage: string | undefined;
    let coverImagePublicId: string | undefined;

    if (coverImageFile) {
      const uploaded = await this.uploadCover(coverImageFile);
      coverImage = uploaded.url;
      coverImagePublicId = uploaded.publicId;
    }

    const post = await this.prismaService.post.create({
      data: {
        ...rest,
        ...(coverImage && { coverImage, coverImagePublicId }),
        ...(content !== undefined && {
          content: content as Prisma.InputJsonValue,
        }),
        ...(tags !== undefined && { tags: tags as Prisma.InputJsonValue }),
      },
    });
    await this.auditLog.log({
      userId: adminUserId,
      action: 'CREATE',
      entity: 'post',
      entityId: String(post.id),
      details: { title: post.title, type: post.type } as Prisma.InputJsonValue,
    });
    return post;
  }

  async findAll(
    page: number = 1,
    pageSize: number = 10,
    sort: string = 'createdAt-desc',
    search?: string,
    filters?: FiltersPostInput,
  ) {
    const regex = /^[a-zA-Z]+-(ASC|DESC|asc|desc)$/;
    if (sort && !regex.test(sort)) {
      throw new BadRequestException(
        'Sort must be in the format [field]-[ASC|DESC]',
      );
    }
    const [field, order] = sort.split('-');
    const orderBy: Prisma.PostOrderByWithRelationInput = {
      [field]: order.toLowerCase() === 'asc' ? 'asc' : 'desc',
    };
    const where: Prisma.PostWhereInput = {
      ...(search && { title: { contains: search, mode: 'insensitive' } }),
      ...(filters?.type?.length && { type: { in: filters.type } }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.isPinned !== undefined && { isPinned: filters.isPinned }),
    };
    const [posts, total] = await this.prismaService.$transaction([
      this.prismaService.post.findMany({
        where,
        orderBy,
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      this.prismaService.post.count({ where }),
    ]);
    return {
      posts,
      meta: { total, page, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async findOne(id: number) {
    const post = await this.prismaService.post.findUnique({ where: { id } });
    if (!post) throw new BadRequestException('Post no encontrado');
    return post;
  }

  async update(
    updatePostInput: UpdatePostInput,
    coverImageFile?: Promise<FileUpload>,
    adminUserId?: string,
  ) {
    const { id, content, tags, ...rest } = updatePostInput;
    const existing = await this.findOne(id);

    let coverImage: string | undefined;
    let coverImagePublicId: string | undefined;

    if (coverImageFile) {
      // Delete old cover from Cloudinary if exists
      if (existing.coverImagePublicId) {
        await this.cloudinary.delete(existing.coverImagePublicId);
      }
      const uploaded = await this.uploadCover(coverImageFile);
      coverImage = uploaded.url;
      coverImagePublicId = uploaded.publicId;
    }

    const post = await this.prismaService.post.update({
      where: { id },
      data: {
        ...rest,
        ...(coverImage && { coverImage, coverImagePublicId }),
        ...(content !== undefined && {
          content: content as Prisma.InputJsonValue,
        }),
        ...(tags !== undefined && { tags: tags as Prisma.InputJsonValue }),
      },
    });
    await this.auditLog.log({
      userId: adminUserId,
      action: 'UPDATE',
      entity: 'post',
      entityId: String(id),
      details: rest as unknown as Prisma.InputJsonValue,
    });
    return post;
  }

  async remove(ids: number[], adminUserId?: string) {
    const found = await this.prismaService.post.findMany({
      where: { id: { in: ids } },
      select: { id: true, coverImagePublicId: true },
    });
    if (found.length !== ids.length) {
      throw new BadRequestException('Uno o más posts no encontrados');
    }
    // Delete cover images from Cloudinary
    for (const post of found) {
      if (post.coverImagePublicId) {
        await this.cloudinary.delete(post.coverImagePublicId);
      }
    }
    await this.prismaService.post.deleteMany({ where: { id: { in: ids } } });
    await this.auditLog.log({
      userId: adminUserId,
      action: 'DELETE',
      entity: 'post',
      details: { ids } as Prisma.InputJsonValue,
    });
    return true;
  }

  async changeStatusPost(ids: number[], status: Status, adminUserId?: string) {
    await this.prismaService.post.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
    await this.auditLog.log({
      userId: adminUserId,
      action: 'UPDATE',
      entity: 'post',
      details: { ids, status } as Prisma.InputJsonValue,
    });
    return true;
  }

  // traer todos los post activos y como maximo las publicadas menores a la fecha actual, ordenados por fecha de publicación descendente y luego por si están fijados o no (isPinned), solo los 5 primeros
  async getPostsFromBanner(type: string) {
    const where: Prisma.PostWhereInput = {
      status: Status.ACTIVE,
      publishedAt: { lte: new Date() },
      ...(type && { type: type as PostType }),
    };
    return this.prismaService.post.findMany({
      where,
      orderBy: [{ publishedAt: 'desc' }, { isPinned: 'desc' }],
      take: 5,
    });
  }

  async findOnePublic(id: number) {
    const post = await this.prismaService.post.findUnique({
      where: { id, status: Status.ACTIVE },
    });
    if (!post) throw new BadRequestException('Post no encontrado');
    return post;
  }

  async getPostsForWebsite(
    page: number = 1,
    pageSize: number = 10,
    sort: string = 'publishedAt-desc',
    search?: string,
    type?: string,
  ) {
    const regex = /^[a-zA-Z]+-(ASC|DESC|asc|desc)$/;
    if (sort && !regex.test(sort)) {
      throw new BadRequestException(
        'Sort must be in the format [field]-[ASC|DESC]',
      );
    }
    const [field, order] = sort.split('-');
    const orderBy: Prisma.PostOrderByWithRelationInput = {
      [field]: order.toLowerCase() === 'asc' ? 'asc' : 'desc',
    };
    const where: Prisma.PostWhereInput = {
      status: Status.ACTIVE,
      publishedAt: { lte: new Date() },
      ...(search && { title: { contains: search, mode: 'insensitive' } }),
      ...(type && { type: type as PostType }),
    };
    const [posts, total] = await this.prismaService.$transaction([
      this.prismaService.post.findMany({
        where,
        orderBy,
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      this.prismaService.post.count({ where }),
    ]);
    return {
      posts,
      meta: { total, page, totalPages: Math.ceil(total / pageSize) },
    };
  }
}
