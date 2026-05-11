import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FileUpload } from 'graphql-upload-ts';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { PrismaService } from 'src/db/prisma.service';
import { UpdateMediaInput } from './dto';
import { Media, Prisma } from 'generated/prisma/client';

@Injectable()
export class MediaService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async uploadMedia(files: Promise<FileUpload>[]): Promise<Media[]> {
    const mediaPromises = files.map(async (file: Promise<FileUpload>) => {
      const resolvedFile = await file;
      const stream = resolvedFile.createReadStream();
      const cloudinaryResponse = await this.cloudinaryService.upload(stream, {
        folder: 'media',
        resource_type: 'auto',
        public_id: `media_${Date.now()}_${resolvedFile.filename}`,
      });
      const mediaData = {
        title: resolvedFile.filename,
        url: cloudinaryResponse.secure_url,
        publicId: cloudinaryResponse.public_id,
        resourceType: cloudinaryResponse.resource_type,
        type: cloudinaryResponse.format,
        bytes: cloudinaryResponse.bytes,
        width: cloudinaryResponse.width,
        height: cloudinaryResponse.height,
        format: cloudinaryResponse.format,
      };
      return await this.prismaService.media.create({
        data: mediaData,
      });
    });

    return Promise.all(mediaPromises);
  }

  async destroyMedia(ids: number[]): Promise<boolean> {
    const media = await this.prismaService.media.findMany({
      where: { id: { in: ids } },
      include: {
        activities: { take: 1 },
        reservations: { take: 1 },
        supportAttachments: { take: 1 },
      },
    });

    if (media.length === 0) {
      throw new NotFoundException('Recurso(s) no encontrado');
    }

    const inUse = media.filter(
      (m) =>
        m.activities.length > 0 ||
        m.reservations.length > 0 ||
        m.supportAttachments.length > 0,
    );

    if (inUse.length > 0) {
      const names = inUse.map((m) => m.title).join(', ');
      throw new ConflictException(
        `No se puede eliminar. Los siguientes archivos están en uso: ${names}`,
      );
    }

    // 1. Borrar primero de DB (estado consistente si falla)
    await this.prismaService.media.deleteMany({
      where: { id: { in: ids } },
    });

    // 2. Luego borrar de Cloudinary (si falla, se puede limpiar después)
    for (const mediaItem of media) {
      try {
        await this.cloudinaryService.delete(mediaItem.publicId);
      } catch (error) {
        console.warn(
          `Error al eliminar de Cloudinary: ${mediaItem.publicId}`,
          error,
        );
      }
    }

    return true;
  }

  async findAll(
    page: number = 1,
    pageSize: number = 8,
    sort: string = 'createdAt-desc',
  ) {
    const regex = /^[a-zA-Z]+-(ASC|DESC|asc|desc)$/;
    if (sort && !regex.test(sort)) {
      throw new BadRequestException(
        'Sort must be in the format [field]-[ASC|DESC]',
      );
    }

    const [field, order] = sort.split('-');

    const orderBy: Prisma.MediaOrderByWithRelationInput = {
      [field]: order.toUpperCase() === 'asc' ? 'asc' : 'desc',
    };
    const medias = await this.prismaService.media.findMany({
      orderBy,
      take: pageSize,
      skip: (page - 1) * pageSize,
    });

    const total = await this.prismaService.media.count();
    return {
      medias,
      meta: {
        total,
        page,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(id: number): Promise<Media> {
    const mediaFound = await this.prismaService.media.findUnique({
      where: { id },
    });
    if (!mediaFound) {
      throw new NotFoundException('Recurso no encontrada');
    }
    return mediaFound;
  }

  async update(id: number, updateMediaInput: UpdateMediaInput): Promise<Media> {
    await this.findOne(id);
    return this.prismaService.media.update({
      where: { id },
      data: updateMediaInput,
    });
  }
}
