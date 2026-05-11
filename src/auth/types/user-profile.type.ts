import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserProfile {
  @Field()
  id!: string;

  @Field({ nullable: true })
  email?: string;

  @Field()
  name!: string;

  @Field()
  paternalSurname!: string;

  @Field()
  maternalSurname!: string;

  @Field()
  dni!: string;

  @Field({ nullable: true })
  memberCode?: string;

  @Field({ nullable: true })
  phone?: string;

  @Field()
  role!: string;

  @Field()
  status!: string;

  @Field()
  memberCategory!: string;

  @Field({ nullable: true })
  birthdate?: Date;

  @Field({ nullable: true })
  address?: string;

  @Field({ nullable: true })
  district?: string;

  @Field({ nullable: true })
  province?: string;

  @Field({ nullable: true })
  department?: string;

  @Field({ nullable: true })
  country?: string;

  @Field()
  createdAt!: Date;
}
