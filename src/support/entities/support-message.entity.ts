import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class SupportMessageAuthor {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  paternalSurname!: string;

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

  @Field(() => Date)
  createdAt!: Date;
}
