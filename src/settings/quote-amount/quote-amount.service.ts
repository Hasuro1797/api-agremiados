import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { CreateQuoteAmountInput } from './dto/create-quote-amount.input';
import { UpdateQuoteAmountInput } from './dto/update-quote-amount.input';

@Injectable()
export class QuoteAmountService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.quoteAmount.findMany({
      where: { organizationId },
      orderBy: { id: 'asc' },
    });
  }

  async create(input: CreateQuoteAmountInput) {
    const org = await this.prisma.organization.findUnique({
      where: { id: input.organizationId },
      select: { id: true },
    });
    if (!org) {
      throw new NotFoundException(
        `Organización con id "${input.organizationId}" no encontrada`,
      );
    }
    return this.prisma.quoteAmount.create({ data: input });
  }

  async update(input: UpdateQuoteAmountInput) {
    const { id, ...data } = input;
    const existing = await this.prisma.quoteAmount.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(
        `Monto de cuota con id "${id}" no encontrado`,
      );
    }
    return this.prisma.quoteAmount.update({ where: { id }, data });
  }

  async remove(ids: number[]) {
    const result = await this.prisma.quoteAmount.deleteMany({
      where: { id: { in: ids } },
    });
    if (result.count !== ids.length) {
      throw new BadRequestException(
        'Algunos montos de cuota no fueron encontrados',
      );
    }
    return true;
  }
}
