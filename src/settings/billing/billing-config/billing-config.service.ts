import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type FileUpload } from 'graphql-upload-ts';
import * as forge from 'node-forge';
import { PrismaService } from 'src/db/prisma.service';
import { buildCapacity } from '../document-series/series-capacity.util';
import { UpsertBillingConfigInput } from './dto/upsert-billing-config.input';

@Injectable()
export class BillingConfigService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrg() {
    const org = await this.prisma.organization.findFirst({
      select: { id: true },
    });
    if (!org) {
      throw new NotFoundException(
        'No se ha configurado la organización. Cree la organización antes de configurar facturación.',
      );
    }
    return org;
  }

  private toEntity(config: any) {
    return {
      ...config,
      hasCertificate: config.certPfxBase64 !== null,
      // Enriquecer las series con campos computados (isExhausted, remainingCapacity...)
      series: Array.isArray(config.series)
        ? config.series.map((s: { correlativo: number }) => ({
            ...s,
            ...buildCapacity(s.correlativo),
          }))
        : config.series,
      // certPfxBase64, certPassword y solPass nunca se devuelven
      certPfxBase64: undefined,
      certPassword: undefined,
      solPass: undefined,
    };
  }

  async getBillingConfig() {
    const config = await this.prisma.billingConfig.findFirst({
      include: { series: { orderBy: [{ tipoDoc: 'asc' }, { serie: 'asc' }] } },
    });
    if (!config) return null;
    return this.toEntity(config);
  }

  async upsertBillingConfig(input: UpsertBillingConfigInput) {
    const org = await this.getOrg();

    const existing = await this.prisma.billingConfig.findUnique({
      where: { organizationId: org.id },
    });

    const data = {
      ruc: input.ruc,
      razonSocial: input.razonSocial,
      comercialName: input.comercialName ?? null,
      solUser: input.solUser,
      solPass: input.solPass,
      ubigeo: input.ubigeo ?? null,
      address: input.address ?? null,
      district: input.district ?? null,
      province: input.province ?? null,
      department: input.department ?? null,
      isActive: input.isActive ?? true,
    };

    const config = existing
      ? await this.prisma.billingConfig.update({
          where: { organizationId: org.id },
          data,
          include: {
            series: { orderBy: [{ tipoDoc: 'asc' }, { serie: 'asc' }] },
          },
        })
      : await this.prisma.billingConfig.create({
          data: { ...data, organizationId: org.id },
          include: {
            series: { orderBy: [{ tipoDoc: 'asc' }, { serie: 'asc' }] },
          },
        });

    return this.toEntity(config);
  }

  async uploadCertificate(file: FileUpload, password: string) {
    const config = await this.prisma.billingConfig.findFirst();
    if (!config) {
      throw new NotFoundException(
        'Configure los datos de facturación antes de subir el certificado.',
      );
    }

    const stream = file.createReadStream();
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', resolve);
      stream.on('error', reject);
    });
    const pfxBuffer = Buffer.concat(chunks);

    // Validar que el PFX sea válido con la contraseña dada antes de guardar
    try {
      const pfxAsn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
      const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, password);

      const keyBags = pfx.getBags({
        bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
      });
      if (!keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]) {
        throw new Error('No se encontró la clave privada en el PFX');
      }
      const certBags = pfx.getBags({ bagType: forge.pki.oids.certBag });
      if (!certBags[forge.pki.oids.certBag]?.[0]) {
        throw new Error('No se encontró el certificado en el PFX');
      }
    } catch (err: any) {
      throw new BadRequestException(
        `El certificado PFX no es válido: ${err.message}`,
      );
    }

    const updated = await this.prisma.billingConfig.update({
      where: { id: config.id },
      data: {
        certPfxBase64: pfxBuffer.toString('base64'),
        certPassword: password,
      },
      include: {
        series: { orderBy: [{ tipoDoc: 'asc' }, { serie: 'asc' }] },
      },
    });

    return this.toEntity(updated);
  }

  async toggleProductionMode(production: boolean) {
    const config = await this.prisma.billingConfig.findFirst({
      include: { series: true },
    });
    if (!config) {
      throw new NotFoundException('No hay configuración de facturación.');
    }

    if (production) {
      if (!config.certPfxBase64) {
        throw new BadRequestException(
          'Suba el certificado digital (PFX) antes de activar el modo producción.',
        );
      }
      const hasActiveSeries = config.series.some((s) => s.isActive);
      if (!hasActiveSeries) {
        throw new BadRequestException(
          'Cree al menos una serie activa antes de activar el modo producción.',
        );
      }
    }

    const updated = await this.prisma.billingConfig.update({
      where: { id: config.id },
      data: { production },
      include: {
        series: { orderBy: [{ tipoDoc: 'asc' }, { serie: 'asc' }] },
      },
    });

    return this.toEntity(updated);
  }

  async removeCertificate() {
    const config = await this.prisma.billingConfig.findFirst();
    if (!config) {
      throw new NotFoundException('No hay configuración de facturación.');
    }
    if (config.production) {
      throw new BadRequestException(
        'No se puede eliminar el certificado con el modo producción activo. Desactívelo primero.',
      );
    }

    const updated = await this.prisma.billingConfig.update({
      where: { id: config.id },
      data: { certPfxBase64: null, certPassword: null },
      include: {
        series: { orderBy: [{ tipoDoc: 'asc' }, { serie: 'asc' }] },
      },
    });

    return this.toEntity(updated);
  }
}
