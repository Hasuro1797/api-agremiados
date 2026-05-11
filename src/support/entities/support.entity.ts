import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Priority, SupportStatus } from 'generated/prisma/enums';
import { SupportCategory } from './support-category.entity';
import { SupportMessage } from './support-message.entity';

@ObjectType()
export class SupportUser {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  paternalSurname!: string;

  @Field(() => String)
  maternalSurname!: string;

  @Field(() => String, { nullable: true })
  memberCode?: string;
}

@ObjectType()
export class Support {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  topic!: string;

  @Field(() => String)
  details!: string;

  @Field(() => String)
  place!: string;

  @Field(() => Int, { nullable: true })
  categoryId?: number;

  @Field(() => SupportCategory, { nullable: true })
  category?: SupportCategory;

  @Field(() => String, { nullable: true })
  subjectDescription?: string;

  @Field(() => String, { nullable: true })
  subjectUserId?: string;

  @Field(() => SupportUser, { nullable: true })
  subjectUser?: SupportUser;

  @Field(() => String, { nullable: true })
  assignedTo?: string;

  @Field(() => String, { nullable: true })
  assignedName?: string;

  @Field(() => String)
  status!: SupportStatus;

  @Field(() => String)
  priority!: Priority;

  @Field(() => Date, { nullable: true })
  dueDate?: Date;

  @Field(() => Date, { nullable: true })
  resolvedAt?: Date;

  @Field(() => String, { nullable: true })
  resolvedBy?: string;

  @Field(() => String, { nullable: true })
  rejectReason?: string;

  @Field(() => Date, { nullable: true })
  reopenedAt?: Date;

  @Field(() => String, { nullable: true })
  reopenReason?: string;

  @Field(() => Date, { nullable: true })
  respondedAt?: Date;

  @Field(() => Int, { nullable: true })
  satisfactionRating?: number;

  @Field(() => String, { nullable: true })
  satisfactionComment?: string;

  @Field(() => String)
  userId!: string;

  @Field(() => SupportUser)
  user!: SupportUser;

  @Field(() => [SupportMessage])
  messages!: SupportMessage[];

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType()
export class SupportPaginated {
  @Field(() => [Support])
  items!: Support[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  pageSize!: number;
}
