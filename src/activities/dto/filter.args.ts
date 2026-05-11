import { ArgsType, Field, InputType } from '@nestjs/graphql';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { ActivityType, Status } from 'generated/prisma/enums';
import { PaginationArgs } from 'src/common/dtos';

@InputType()
export class FiltersActivityInput {
  @Field(() => Date, {
    nullable: true,
    description: 'Fecha de inicio del rango de búsqueda',
  })
  @IsOptional()
  @IsDate()
  startDate?: Date;

  @Field(() => Date, {
    nullable: true,
    description: 'Fecha de fin del rango de búsqueda',
  })
  @IsOptional()
  @IsDate()
  endDate?: Date;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Filtrar por actividades con precio',
  })
  @IsOptional()
  @IsBoolean()
  hasPrice?: boolean;

  @Field(() => String, {
    nullable: true,
    description: 'Filtrar por tipo: SOCIAL o ACADEMIC',
  })
  @IsOptional()
  @IsEnum(ActivityType)
  type?: ActivityType;

  @Field(() => String, {
    nullable: true,
    description: 'Filtrar por estado: ACTIVE o DRAFT',
  })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}

@ArgsType()
export class ActivitiesArgs extends PaginationArgs {
  @Field(() => String, { nullable: true, defaultValue: 'createdAt-desc' })
  @IsOptional()
  @IsString()
  orderBy?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => FiltersActivityInput, { nullable: true })
  @IsOptional()
  filters?: FiltersActivityInput;
}
