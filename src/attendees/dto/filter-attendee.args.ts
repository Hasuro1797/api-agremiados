import { ArgsType, Field, InputType, Int } from '@nestjs/graphql';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { AttendanceStatus, AttendeeType } from 'generated/prisma/enums';
import { PaginationArgs } from 'src/common/dtos';

@InputType()
export class FiltersAttendeeInput {
  @Field(() => String, {
    nullable: true,
    description: 'Filtrar por estado de asistencia',
  })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @Field(() => AttendeeType, {
    nullable: true,
    description: 'Filtrar por tipo de asistente (MEMBER, INVITED, EXTERNAL)',
  })
  @IsOptional()
  @IsEnum(AttendeeType)
  attendeeType?: AttendeeType;
}

@ArgsType()
export class FilterAttendeeArgs extends PaginationArgs {
  @Field(() => Int, { description: 'ID de la actividad' })
  @IsInt()
  @IsPositive()
  activityId!: number;

  @Field(() => String, { nullable: true, defaultValue: 'createdAt-desc' })
  @IsOptional()
  @IsString()
  orderBy?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => FiltersAttendeeInput, { nullable: true })
  @IsOptional()
  filters?: FiltersAttendeeInput;
}
