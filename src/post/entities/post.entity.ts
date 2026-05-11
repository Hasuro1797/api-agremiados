import { ObjectType, Field, Int } from '@nestjs/graphql';
import { PostType, Status } from 'generated/prisma/enums';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class Post {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  title!: string;

  @Field(() => String, { nullable: true })
  slug?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  content?: any;

  @Field(() => String, { nullable: true })
  contentHtml?: string;

  @Field(() => String, { nullable: true })
  coverImage?: string;

  @Field(() => String, { nullable: true })
  coverImagePublicId?: string;

  @Field(() => String, { nullable: true })
  href?: string;

  @Field(() => String, { nullable: true })
  author?: string;

  @Field(() => [String], { nullable: true })
  tags?: any;

  @Field(() => String)
  type!: PostType;

  @Field(() => String)
  status!: Status;

  @Field(() => Boolean)
  isPinned!: boolean;

  @Field(() => Date, { nullable: true })
  publishedAt?: Date;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
