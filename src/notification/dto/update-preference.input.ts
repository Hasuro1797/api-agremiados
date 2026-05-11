import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { NotificationChannel } from 'generated/prisma/enums';

@InputType()
export class UpdateNotificationPreferenceInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  triggerKey!: string;

  @Field(() => NotificationChannel)
  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @Field(() => Boolean)
  @IsBoolean()
  enabled!: boolean;
}
