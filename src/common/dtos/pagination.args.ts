import { ArgsType, Field, Int } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsPositive } from 'class-validator';

@ArgsType()
export class PaginationArgs {
  @Field(() => Int, { defaultValue: 1, description: 'Número de página' })
  @Transform(({ value }) => Number(value))
  @IsPositive()
  page!: number;

  @Field(() => Int, {
    defaultValue: 8,
    description: 'Cantidad de resultados por página',
  })
  @IsPositive()
  @Transform(({ value }) => Number(value))
  @Transform(({ value }: { value: number }) => (value > 100 ? 100 : value))
  pageSize!: number;
}
