import { ObjectType, Field, Int } from '@nestjs/graphql';
import { AgreementCategory, Status } from 'generated/prisma/enums';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class Agreement {
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

  @Field(() => String)
  status!: Status;

  @Field(() => String, { nullable: true })
  partnerName?: string;

  @Field(() => String, { nullable: true })
  partnerLogo?: string;

  @Field(() => String, { nullable: true })
  partnerWebsite?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  contactInfo?: any;

  @Field(() => String, { nullable: true })
  benefitSummary?: string;

  @Field(() => String)
  category!: AgreementCategory;

  @Field(() => Date, { nullable: true })
  validFrom?: Date;

  @Field(() => Date, { nullable: true })
  validUntil?: Date;

  @Field(() => [String], { nullable: true })
  tags?: any;

  @Field(() => Date, { nullable: true })
  publishedAt?: Date;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
