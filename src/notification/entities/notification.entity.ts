import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  NotificationChannel,
  NotificationStatus,
} from 'generated/prisma/enums';

registerEnumType(NotificationChannel, {
  name: 'NotificationChannel',
  description: 'Canal de notificación',
});

registerEnumType(NotificationStatus, {
  name: 'NotificationStatus',
  description: 'Estado de una notificación',
});

@ObjectType()
export class NotificationEntity {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  userId!: string;

  @Field(() => String)
  subject!: string;

  @Field(() => String)
  body!: string;

  @Field(() => NotificationChannel)
  channel!: NotificationChannel;

  @Field(() => NotificationStatus)
  status!: NotificationStatus;

  @Field(() => Date, { nullable: true })
  readAt?: Date;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType()
export class NotificationsPaginated {
  @Field(() => [NotificationEntity])
  notifications!: NotificationEntity[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  unreadCount!: number;
}
