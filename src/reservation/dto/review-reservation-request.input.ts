import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ReservationRequestStatus } from 'generated/prisma/enums';

@InputType()
export class ReviewReservationRequestInput {
  @IsNotEmpty()
  @IsString()
  @Field(() => String)
  id!: string;

  @IsNotEmpty()
  @IsEnum(ReservationRequestStatus)
  @Field(() => String)
  status!: ReservationRequestStatus;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  adminComment?: string;
}
