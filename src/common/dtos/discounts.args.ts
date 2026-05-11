import { Field, InputType } from '@nestjs/graphql';
import { IsDate, IsNotEmpty } from 'class-validator';

@InputType()
export class RangeDiscountDates {
  @Field(() => Date, {
    description: 'Desde fecha del rango de descuento',
  })
  @IsNotEmpty({
    message: 'La fecha de inicio es requerida',
  })
  @IsDate({
    message: 'Debe ser una fecha valida',
  })
  from!: Date;

  @Field(() => Date, {
    description: 'Hasta fecha del rango de descuento',
  })
  @IsNotEmpty({
    message: 'La fecha de fin es requerida',
  })
  @IsDate({
    message: 'Debe ser una fecha valida',
  })
  to!: Date;
}
