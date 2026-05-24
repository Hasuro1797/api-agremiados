import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SunatDocType } from 'generated/prisma/enums';

@InputType()
export class CreateDocumentSeriesInput {
  @Field(() => SunatDocType)
  @IsEnum(SunatDocType)
  tipoDoc!: SunatDocType;

  @Field(() => String, {
    description:
      'Serie del comprobante. FACTURA: F001-F999. BOLETA: B001-B999. NOTA_CREDITO: FC01/BC01. NOTA_DEBITO: FD01/BD01',
  })
  @IsString()
  @IsNotEmpty()
  serie!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;
}
