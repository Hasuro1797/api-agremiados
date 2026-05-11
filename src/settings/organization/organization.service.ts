import { Injectable, NotFoundException } from '@nestjs/common';
import { FileUpload } from 'graphql-upload-ts';
import { PrismaService } from 'src/db/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { UpdateOrganizationInput } from './dto/update-organization.input';
import { BrandingImageField } from './dto/branding-image-field.enum';
import { Prisma } from 'generated/prisma/client';
import { deriveOrganizationColors } from './color.utils';

const PUBLIC_ORGANIZATION_SELECT = {
  id: true,
  name: true,
  description: true,
  code: true,
  logo: true,
  favicon: true,
  primaryColor: true,
  primaryLight: true,
  accentColor: true,
  accentHover: true,
  bannerUrl: true,
  address: true,
  phone: true,
  email: true,
  website: true,
  socialMedia: true,
  footerText: true,
  footerLinks: true,
  moduleEvents: true,
  moduleReservations: true,
  moduleSurveys: true,
  moduleSupport: true,
  moduleAgreements: true,
  moduleQuotes: true,
  modulePosts: true,
  moraAutoBlock: true,
} satisfies Prisma.OrganizationSelect;

@Injectable()
export class OrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async getOrganization() {
    const org = await this.prisma.organization.findFirst({
      include: { quotaAmounts: true },
    });
    if (!org) {
      throw new NotFoundException('No se ha configurado la organización aún');
    }
    return org;
  }

  async getPublicOrganization() {
    return this.prisma.organization.findFirst({
      select: PUBLIC_ORGANIZATION_SELECT,
    });
  }

  async upsertOrganization(input: UpdateOrganizationInput) {
    const existing = await this.prisma.organization.findFirst({
      select: { id: true },
    });

    const {
      socialMedia,
      footerLinks,
      moraReminderDays,
      primaryColor,
      accentColor,
      ...rest
    } = input;

    // Derivar colores automáticamente cuando se cambia primary o accent
    const colorFields: Partial<{
      primaryColor: string;
      primaryLight: string;
      accentColor: string;
      accentHover: string;
    }> = {};
    if (primaryColor !== undefined || accentColor !== undefined) {
      const existing = await this.prisma.organization.findFirst({
        select: { primaryColor: true, accentColor: true },
      });
      const baseP = primaryColor ?? existing?.primaryColor ?? '#232c57';
      const baseA = accentColor ?? existing?.accentColor ?? '#FF7043';
      const { primaryLight, accentHover } = deriveOrganizationColors(
        baseP,
        baseA,
      );
      if (primaryColor !== undefined) {
        colorFields.primaryColor = primaryColor;
        colorFields.primaryLight = primaryLight;
      }
      if (accentColor !== undefined) {
        colorFields.accentColor = accentColor;
        colorFields.accentHover = accentHover;
      }
    }

    const jsonFields = {
      ...(socialMedia !== undefined && {
        socialMedia: socialMedia as Prisma.InputJsonValue,
      }),
      ...(footerLinks !== undefined && {
        footerLinks: footerLinks as Prisma.InputJsonValue,
      }),
      ...(moraReminderDays !== undefined && {
        moraReminderDays: moraReminderDays as Prisma.InputJsonValue,
      }),
    };

    if (existing) {
      return this.prisma.organization.update({
        where: { id: existing.id },
        data: { ...rest, ...colorFields, ...jsonFields },
        include: { quotaAmounts: true },
      });
    }

    // Primera vez: calcular colores derivados con los valores por defecto si no se enviaron
    const finalP = colorFields.primaryColor ?? '#232c57';
    const finalA = colorFields.accentColor ?? '#FF7043';
    const {
      primaryLight: defaultPrimaryLight,
      accentHover: defaultAccentHover,
    } = deriveOrganizationColors(finalP, finalA);

    return this.prisma.organization.create({
      data: {
        name: rest.name ?? 'Mi Colegio Profesional',
        ...rest,
        primaryColor: finalP,
        primaryLight: colorFields.primaryLight ?? defaultPrimaryLight,
        accentColor: finalA,
        accentHover: colorFields.accentHover ?? defaultAccentHover,
        ...jsonFields,
      },
      include: { quotaAmounts: true },
    });
  }

  /** Sube una imagen de branding (logo, favicon, banner) a Cloudinary y guarda la URL. */
  async uploadBrandingImage(field: BrandingImageField, file: FileUpload) {
    // Consumir el stream PRIMERO (igual que MediaService) antes de cualquier operación async
    const resolvedFile = await (file as unknown as Promise<FileUpload>);
    const stream = resolvedFile.createReadStream();
    const response = await this.cloudinary.upload(stream, {
      folder: `organization/${field}`,
      resource_type: 'image',
      public_id: `${field}_${Date.now()}`,
    });

    // Operaciones de BD después de subir el archivo
    let org = await this.prisma.organization.findFirst({
      select: { id: true, logo: true, favicon: true, bannerUrl: true },
    });

    if (!org) {
      org = await this.prisma.organization.create({
        data: { name: 'Mi Colegio Profesional' },
        select: { id: true, logo: true, favicon: true, bannerUrl: true },
      });
    }

    // Eliminar imagen anterior de Cloudinary si existía
    const currentUrl = org[field];
    if (currentUrl) {
      const publicId = this.extractPublicId(currentUrl);
      if (publicId) {
        await this.cloudinary.delete(publicId);
      }
    }

    return this.prisma.organization.update({
      where: { id: org.id },
      data: { [field]: response.secure_url },
      include: { quotaAmounts: true },
    });
  }

  /** Elimina la imagen de branding actual de Cloudinary y limpia el campo. */
  async deleteBrandingImage(field: BrandingImageField) {
    const org = await this.prisma.organization.findFirst({
      select: { id: true, logo: true, favicon: true, bannerUrl: true },
    });
    if (!org) {
      throw new NotFoundException('No se ha configurado la organización aún');
    }

    const currentUrl = org[field];
    if (!currentUrl) {
      throw new NotFoundException(`No hay imagen de ${field} para eliminar`);
    }

    const publicId = this.extractPublicId(currentUrl);
    console.log('Deleting image with publicId:', publicId);
    if (publicId) {
      await this.cloudinary.delete(publicId);
    }

    return this.prisma.organization.update({
      where: { id: org.id },
      data: { [field]: null },
      include: { quotaAmounts: true },
    });
  }

  /** Extrae el publicId de una URL de Cloudinary. */
  private extractPublicId(url: string): string | null {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
    return match?.[1] ?? null;
  }
}
