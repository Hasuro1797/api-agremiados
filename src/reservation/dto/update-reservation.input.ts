import { IsNotEmpty, IsNumber } from 'class-validator';
import { CreateReservationInput } from './create-reservation.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateReservationInput extends PartialType(
  CreateReservationInput,
) {
  @IsNotEmpty()
  @IsNumber()
  @Field(() => Int)
  id!: number;
}
