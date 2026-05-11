import { Field, ObjectType } from '@nestjs/graphql';
import { QuotaSummary } from 'src/quotas/entities/quota-summary.entity';

@ObjectType()
export class Member {
  @Field(() => String)
  id!: string;

  @Field(() => String, { nullable: true })
  email?: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  paternalSurname!: string;

  @Field(() => String)
  maternalSurname!: string;

  @Field(() => String, { nullable: true })
  dni?: string;

  @Field(() => String, { nullable: true })
  memberCode?: string;

  @Field(() => String, { nullable: true })
  phone?: string;

  @Field(() => Date, { nullable: true })
  birthdate?: Date;

  @Field(() => String, { nullable: true })
  address?: string;

  @Field(() => String, { nullable: true })
  district?: string;

  @Field(() => String, { nullable: true })
  province?: string;

  @Field(() => String, { nullable: true })
  department?: string;

  @Field(() => String, { nullable: true })
  country?: string;

  @Field(() => String)
  role!: string;

  @Field(() => String)
  status!: string;

  @Field(() => String)
  memberCategory!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => QuotaSummary, { nullable: true })
  quotaSummary?: QuotaSummary;
}
