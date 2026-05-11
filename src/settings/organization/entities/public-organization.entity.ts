import { ObjectType, Field } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class PublicOrganizationEntity {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  code?: string;

  // Branding / UI
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

  // Contact info (footer)
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

  // Module toggles (para que el front active/desactive secciones)
  @Field(() => Boolean)
  moduleEvents!: boolean;

  @Field(() => Boolean)
  moduleReservations!: boolean;

  @Field(() => Boolean)
  moduleSurveys!: boolean;

  @Field(() => Boolean)
  moduleSupport!: boolean;

  @Field(() => Boolean)
  modulePosts!: boolean;

  @Field(() => Boolean)
  moduleAgreements!: boolean;

  @Field(() => Boolean)
  moduleQuotes!: boolean;

  @Field(() => Boolean)
  moraAutoBlock!: boolean;
}
