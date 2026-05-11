import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class Media {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  url!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  resourceType!: string;

  @Field(() => String)
  publicId!: string;

  @Field(() => Int)
  bytes!: number;

  @Field(() => Int)
  width!: number;

  @Field(() => Int)
  height!: number;

  @Field(() => String, { nullable: true })
  format?: string;

  @Field(() => String, { nullable: true })
  alt?: string;

  @Field(() => String, { nullable: true })
  caption?: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
