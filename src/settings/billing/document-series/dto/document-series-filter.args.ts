import { ArgsType, Field } from '@nestjs/graphql';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { SunatDocType } from 'generated/prisma/enums';

@ArgsType()
export class DocumentSeriesFilterArgs {
  @Field(() => SunatDocType, { nullable: true })
  @IsOptional()
  @IsEnum(SunatDocType)
  tipoDoc?: SunatDocType;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
