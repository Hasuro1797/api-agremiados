import { ArgsType, Field, InputType, Int, OmitType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsPositive } from 'class-validator';
import { ReservationRequestStatus } from 'generated/prisma/enums';
import { PaginationArgs } from 'src/common/dtos';

@ArgsType()
export class ReservationRequestsArgs extends PaginationArgs {
  @Field(() => Int)
  @IsPositive()
  reservationId!: number;

  @IsOptional()
  @IsEnum(ReservationRequestStatus)
  @Field(() => String, { nullable: true })
  status?: ReservationRequestStatus;
}

@ArgsType()
export class ReservationRequestsArgsAll extends OmitType(
  ReservationRequestsArgs,
  ['reservationId'] as const,
) {}

@InputType()
export class ReservationRequestFiltersInput {
  @IsOptional()
  @IsEnum(ReservationRequestStatus)
  @Field(() => String, { nullable: true })
  status?: ReservationRequestStatus;
}
