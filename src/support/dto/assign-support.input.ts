import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Priority } from 'generated/prisma/enums';

@InputType()
export class AssignSupportInput {
  @IsInt()
  @Field(() => Int)
  supportId!: number;

  @IsUUID()
  @Field(() => String)
  assignedTo!: string;

  @IsString()
  @Field(() => String)
  assignedName!: string;

  @IsOptional()
  @IsDateString()
  @Field(() => Date, { nullable: true })
  dueDate?: Date;

  @IsOptional()
  @IsEnum(Priority)
  @Field(() => String, { nullable: true })
  priority?: Priority;
}
