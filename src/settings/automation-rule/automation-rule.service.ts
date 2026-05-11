import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/db/prisma.service';
import { CreateAutomationRuleInput } from './dto/create-automation-rule.input';
import { UpdateAutomationRuleInput } from './dto/update-automation-rule.input';

@Injectable()
export class AutomationRuleService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.automationRule.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const rule = await this.prisma.automationRule.findUnique({ where: { id } });
    if (!rule) {
      throw new NotFoundException(
        `Regla de automatización con id "${id}" no encontrada`,
      );
    }
    return rule;
  }

  async create(input: CreateAutomationRuleInput) {
    const { config, ...rest } = input;
    return this.prisma.automationRule.create({
      data: {
        ...rest,
        config: config as Prisma.InputJsonValue,
      },
    });
  }

  async update(input: UpdateAutomationRuleInput) {
    const { id, config, ...rest } = input;
    await this.findOne(id);
    return this.prisma.automationRule.update({
      where: { id },
      data: {
        ...rest,
        ...(config !== undefined && {
          config: config as Prisma.InputJsonValue,
        }),
      },
    });
  }

  async toggle(id: number) {
    const rule = await this.findOne(id);
    return this.prisma.automationRule.update({
      where: { id },
      data: { isActive: !rule.isActive },
    });
  }
}
