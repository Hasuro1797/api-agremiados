import { ObjectType, Field, Int } from '@nestjs/graphql';
import { SupportAttachment } from './support-attachment.entity';

@ObjectType()
export class SupportMessageAuthor {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  paternalSurname!: string;

  @Field(() => String)
  maternalSurname!: string;

  @Field(() => String)
  role!: string;
}

@ObjectType()
export class SupportMessage {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  supportId!: number;

  @Field(() => String)
  authorId!: string;

  @Field(() => SupportMessageAuthor)
  author!: SupportMessageAuthor;

  @Field(() => String)
  body!: string;

  @Field(() => Boolean)
  isInternal!: boolean;

  @Field(() => [SupportAttachment])
  attachments!: SupportAttachment[];

  @Field(() => Date)
  createdAt!: Date;
}
