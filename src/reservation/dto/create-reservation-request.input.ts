import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

@InputType()
export class CreateReservationRequestInput {
  @IsInt()
  @IsNotEmpty()
  @Field(() => Int)
  reservationId!: number;

  @IsNotEmpty()
  @IsString()
  @Field(() => String)
  eventName!: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  purpose?: string;

  @IsInt()
  @Min(1)
  @Field(() => Int)
  guestCount!: number;

  @IsNotEmpty()
  @Field(() => Date)
  startDate!: Date;

  @IsNotEmpty()
  @Field(() => Date)
  endDate!: Date;
}
