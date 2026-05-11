import { Field, ObjectType } from '@nestjs/graphql';
import { UserStatus } from 'generated/prisma/enums';

@ObjectType()
export class StatusMember {
  @Field(() => String)
  status!: UserStatus;

  @Field(() => Boolean)
  hasPaymentPerDay!: boolean;

  @Field(() => Boolean)
  hasRegistered!: boolean;
}
