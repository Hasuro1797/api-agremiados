import { InputType, Field } from '@nestjs/graphql';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { NotificationChannel } from 'generated/prisma/enums';

@InputType()
export class CreateNotificationTemplateInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  code!: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  name!: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  subject!: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  body!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  shortBody?: string;

  @Field(() => [String], { nullable: true, defaultValue: ['EMAIL'] })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  @IsOptional()
  @IsBoolean()
  isCritical?: boolean;

  @Field(() => Boolean, { nullable: true, defaultValue: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
