import { Field, Int, ObjectType } from '@nestjs/graphql';
import { NotificationChannel } from 'generated/prisma/enums';

@ObjectType()
export class NotificationPreferenceEntity {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  triggerKey!: string;

  @Field(() => NotificationChannel)
  channel!: NotificationChannel;

  @Field(() => Boolean)
  enabled!: boolean;
}
