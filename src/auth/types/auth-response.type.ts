import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AuthUser {
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

  @Field({ nullable: true })
  dni?: string;

  @Field({ nullable: true })
  memberCode?: string;

  @Field()
  role!: string;

  @Field()
  status!: string;
}

@ObjectType()
export class AuthResponse {
  @Field()
  access_token!: string;

  @Field()
  refresh_token!: string;

  @Field(() => AuthUser)
  user!: AuthUser;
}
@ObjectType()
export class MessageResponse {
  @Field()
  message!: string;
}
