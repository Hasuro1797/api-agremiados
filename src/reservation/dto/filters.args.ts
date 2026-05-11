import { ArgsType, Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SpaceType, Status } from 'generated/prisma/enums';
import { PaginationArgs } from 'src/common/dtos';

@InputType()
export class FiltersReservationInput {
  @IsOptional()
  @IsEnum(Status)
  @Field(() => String, { nullable: true })
  status?: Status;

  @IsOptional()
  @IsEnum(SpaceType)
  @Field(() => String, { nullable: true })
  spaceType?: SpaceType;
}

@ArgsType()
export class ReservationsArgs extends PaginationArgs {
  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true, defaultValue: 'createdAt-desc' })
  orderBy?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  search?: string;

  @IsOptional()
  @Field(() => FiltersReservationInput, { nullable: true })
  filters?: FiltersReservationInput;
}
