import { Field, ObjectType } from '@nestjs/graphql';
import { Meta } from 'src/common/entities/meta.entity';
import { Member } from './member.entity';

@ObjectType()
export class MembersResponse {
  @Field(() => [Member])
  members!: Member[];

  @Field(() => Meta)
  meta!: Meta;
}
