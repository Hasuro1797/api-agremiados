import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SunatDocType } from 'generated/prisma/enums';
import { PrismaService, PrismaTx } from 'src/db/prisma.service';
import { CreateDocumentSeriesInput } from './dto/create-document-series.input';
import { DocumentSeriesFilterArgs } from './dto/document-series-filter.args';
import { UpdateDocumentSeriesInput } from './dto/update-document-series.input';
import { MAX_CORRELATIVO, buildCapacity } from './series-capacity.util';

// Patrones válidos de serie por tipo de comprobante SUNAT
const SERIE_PATTERNS: Record<SunatDocType, RegExp> = {
  [SunatDocType.FACTURA]: /^F\d{3}$/,
  [SunatDocType.BOLETA]: /^B\d{3}$/,
  [SunatDocType.NOTA_CREDITO]: /^[FB]C\d{2}$/,
  [SunatDocType.NOTA_DEBITO]: /^[FB]D\d{2}$/,
};

const SERIE_EXAMPLES: Record<SunatDocType, string> = {
  [SunatDocType.FACTURA]: 'F001',
  [SunatDocType.BOLETA]: 'B001',
  [SunatDocType.NOTA_CREDITO]: 'FC01 o BC01',
  [SunatDocType.NOTA_DEBITO]: 'FD01 o BD01',
};

@Injectable()
export class DocumentSeriesService {
  constructor(private readonly prisma: PrismaService) {}

  private async getConfig() {
    const config = await this.prisma.billingConfig.findFirst({
      select: { id: true },
    });
    if (!config) {
      throw new NotFoundException(
        'Configure los datos de facturación antes de gestionar series.',
      );
    }
    return config;
  }

  private withCapacity<T extends { correlativo: number }>(series: T) {
    return { ...series, ...buildCapacity(series.correlativo) };
  }

  async list(filters: DocumentSeriesFilterArgs) {
    const config = await this.getConfig();
    const rows = await this.prisma.documentSeries.findMany({
      where: {
        billingConfigId: config.id,
        ...(filters.tipoDoc !== undefined && { tipoDoc: filters.tipoDoc }),
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
      },
      orderBy: [{ tipoDoc: 'asc' }, { serie: 'asc' }],
    });
    return rows.map((r) => this.withCapacity(r));
  }

  async findOne(id: number) {
    const config = await this.getConfig();
    const series = await this.prisma.documentSeries.findFirst({
      where: { id, billingConfigId: config.id },
    });
    if (!series) {
      throw new NotFoundException(`Serie con id ${id} no encontrada.`);
    }
    return this.withCapacity(series);
  }

  async create(input: CreateDocumentSeriesInput) {
    const config = await this.getConfig();
    const pattern = SERIE_PATTERNS[input.tipoDoc];

    if (!pattern.test(input.serie)) {
      throw new BadRequestException(
        `Formato de serie inválido para ${input.tipoDoc}. Ejemplo correcto: ${SERIE_EXAMPLES[input.tipoDoc]}`,
      );
    }

    const existing = await this.prisma.documentSeries.findFirst({
      where: {
        billingConfigId: config.id,
        tipoDoc: input.tipoDoc,
        serie: input.serie,
      },
    });
    if (existing) {
      throw new BadRequestException(
        `Ya existe una serie "${input.serie}" para ${input.tipoDoc}.`,
      );
    }

    const created = await this.prisma.documentSeries.create({
      data: {
        billingConfigId: config.id,
        tipoDoc: input.tipoDoc,
        serie: input.serie,
        description: input.description ?? null,
        correlativo: 1,
        isActive: true,
      },
    });
    return this.withCapacity(created);
  }

  async update(id: number, input: UpdateDocumentSeriesInput) {
    await this.findOne(id);
    const updated = await this.prisma.documentSeries.update({
      where: { id },
      data: {
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });
    return this.withCapacity(updated);
  }

  async peekNextCorrelativo(tipoDoc: SunatDocType) {
    const config = await this.getConfig();
    // Selecciona la primera serie activa que aún no esté agotada
    const candidates = await this.prisma.documentSeries.findMany({
      where: { billingConfigId: config.id, tipoDoc, isActive: true },
      orderBy: { serie: 'asc' },
      select: { id: true, serie: true, correlativo: true },
    });
    const usable = candidates.find((s) => s.correlativo <= MAX_CORRELATIVO);
    if (!usable) return null;
    return { ...usable, ...buildCapacity(usable.correlativo) };
  }

  /**
   * Reserva el siguiente correlativo de forma atómica e idempotente dentro de
   * una transacción. Lo usará el InvoiceService (Fase 2) al emitir un comprobante.
   * Devuelve el correlativo a usar y deja la serie apuntando al siguiente.
   *
   * @throws BadRequestException si la serie está agotada (>99,999,999) o inactiva
   */
  async reserveCorrelativo(
    tx: PrismaTx,
    seriesId: number,
  ): Promise<{ serie: string; correlativo: number }> {
    const series = await tx.documentSeries.findUnique({
      where: { id: seriesId },
      select: { id: true, serie: true, correlativo: true, isActive: true },
    });
    if (!series) {
      throw new NotFoundException(`Serie con id ${seriesId} no encontrada.`);
    }
    if (!series.isActive) {
      throw new BadRequestException(
        `La serie ${series.serie} está inactiva y no puede emitir comprobantes.`,
      );
    }
    if (series.correlativo > MAX_CORRELATIVO) {
      throw new BadRequestException(
        `La serie ${series.serie} alcanzó el correlativo máximo (${MAX_CORRELATIVO}). ` +
          `Cree una nueva serie para seguir emitiendo.`,
      );
    }
    const reserved = series.correlativo;
    await tx.documentSeries.update({
      where: { id: seriesId },
      data: { correlativo: reserved + 1 },
    });
    return { serie: series.serie, correlativo: reserved };
  }
}
