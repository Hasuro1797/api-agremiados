import { ArgsType, Field } from '@nestjs/graphql';
import { IsEnum, IsOptional } from 'class-validator';
import { InvoiceItemType, InvoiceStatus } from 'generated/prisma/enums';
import { PaginationArgs } from 'src/common/dtos/pagination.args';
import '../entities/invoice.enums';

@ArgsType()
export class MyPaymentsArgs extends PaginationArgs {
  @Field(() => InvoiceStatus, {
    nullable: true,
    description: 'Filtra por estado del comprobante (ej. PAGADO, FACTURADO)',
  })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @Field(() => InvoiceItemType, {
    nullable: true,
    description: 'Filtra por tipo: QUOTA (cuotas) o ACTIVITY_ATTENDEE (eventos)',
  })
  @IsOptional()
  @IsEnum(InvoiceItemType)
  itemType?: InvoiceItemType;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  dateFrom?: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  dateTo?: Date;
}
