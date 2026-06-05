import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Media } from 'src/media/entities/media.entity';

@ObjectType()
export class SupportAttachment {
  @Field(() => Int)
  mediaId!: number;

  @Field(() => Int)
  order!: number;

  @Field(() => Media)
  media!: Media;
}
