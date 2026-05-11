import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from 'generated/prisma/client';
import { EnvConfig } from 'src/config';

export type PrismaTx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private config: ConfigService<EnvConfig>) {
    const adapter = new PrismaPg({
      connectionString: config.get('DATABASE_URL', { infer: true })!,
    });
    super({ adapter });
  }
  async onModuleInit() {
    await this.$connect();
    Logger.log('Database connected', 'PrismaService');
  }
  async onModuleDestroy() {
    await this.$disconnect();
    Logger.log('Database disconnected', 'PrismaService');
  }
}
