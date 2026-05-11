import { Field, ObjectType } from '@nestjs/graphql';
import { Media } from './media.entity';
import { Meta } from 'src/common/entities/meta.entity';

@ObjectType()
export class MediasResponse {
  @Field(() => [Media], { nullable: true })
  medias: Media[];

  @Field(() => Meta)
  meta: Meta;
}
