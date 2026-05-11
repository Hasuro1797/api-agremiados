import { Field, ObjectType } from '@nestjs/graphql';
import { Meta } from 'src/common/entities/meta.entity';
import { Post } from './post.entity';

@ObjectType()
export class Posts {
  @Field(() => [Post])
  posts!: Post[];

  @Field(() => Meta)
  meta!: Meta;
}
