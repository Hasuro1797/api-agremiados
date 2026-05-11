import { Field, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { QuoteAmountEntity } from '../../quote-amount/entities/quote-amount.entity';

@ObjectType()
export class OrganizationEntity {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  code?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  // Branding
  @Field(() => String, { nullable: true })
  logo?: string;

  @Field(() => String, { nullable: true })
  favicon?: string;

  @Field(() => String)
  primaryColor!: string;

  @Field(() => String, {
    description: 'Derivado automáticamente de primaryColor (+8% luminosidad)',
  })
  primaryLight!: string;

  @Field(() => String)
  accentColor!: string;

  @Field(() => String, {
    description: 'Derivado automáticamente de accentColor (-10% luminosidad)',
  })
  accentHover!: string;

  @Field(() => String, { nullable: true })
  bannerUrl?: string;

  // Contact info
  @Field(() => String, { nullable: true })
  address?: string;

  @Field(() => String, { nullable: true })
  phone?: string;

  @Field(() => String, { nullable: true })
  email?: string;

  @Field(() => String, { nullable: true })
  website?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  socialMedia?: unknown;

  @Field(() => String, { nullable: true })
  footerText?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  footerLinks?: unknown;

  // Module toggles
  @Field(() => Boolean)
  moduleEvents!: boolean;

  @Field(() => Boolean)
  moduleReservations!: boolean;

  @Field(() => Boolean)
  moduleSurveys!: boolean;

  @Field(() => Boolean)
  moduleSupport!: boolean;

  @Field(() => Boolean)
  moduleAgreements!: boolean;

  @Field(() => Boolean)
  moduleQuotes!: boolean;

  // Mora config
  @Field(() => Int)
  moraGraceDays!: number;

  @Field(() => GraphQLJSON)
  moraReminderDays!: unknown;

  @Field(() => Boolean)
  moraAutoBlock!: boolean;

  @Field(() => Int, {
    nullable: true,
    description: 'Día del mes en que vence la cuota (1-28)',
  })
  quotaDueDay?: number;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => [QuoteAmountEntity], { nullable: true })
  quotaAmounts?: QuoteAmountEntity[];
}
