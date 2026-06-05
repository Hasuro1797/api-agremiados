import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Priority } from 'generated/prisma/enums';
import '../entities/support.enums';

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
  @IsDate()
  @Field(() => Date, { nullable: true })
  dueDate?: Date;

  @IsOptional()
  @IsEnum(Priority)
  @Field(() => Priority, { nullable: true })
  priority?: Priority;
}
