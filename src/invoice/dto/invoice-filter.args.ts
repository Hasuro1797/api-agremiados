import { ArgsType, Field } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import {
  InvoiceStatus,
  SunatStatus,
  SunatDocType,
} from 'generated/prisma/enums';
import { PaginationArgs } from 'src/common/dtos/pagination.args';

@ArgsType()
export class InvoiceFilterArgs extends PaginationArgs {
  @Field(() => InvoiceStatus, { nullable: true })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @Field(() => SunatStatus, { nullable: true })
  @IsOptional()
  @IsEnum(SunatStatus)
  sunatStatus?: SunatStatus;

  @Field(() => SunatDocType, { nullable: true })
  @IsOptional()
  @IsEnum(SunatDocType)
  sunatDocType?: SunatDocType;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  userId?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Busca por orderNumber, documentNumber o clientName',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  dateFrom?: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  dateTo?: Date;
}
