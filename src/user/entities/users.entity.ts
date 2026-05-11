import { Field, ObjectType } from '@nestjs/graphql';
import { Meta } from 'src/common/entities/meta.entity';
// import { User } from './user.entity';
import { UserProfile } from 'src/auth/types';

@ObjectType()
export class UsersResponse {
  @Field(() => [UserProfile], {
    description: 'Lista de usuarios',
  })
  users!: UserProfile[];

  @Field(() => Meta)
  meta!: Meta;
}
