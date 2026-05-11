import { Field, ObjectType } from '@nestjs/graphql';
import { Meta } from 'src/common/entities/meta.entity';
import { Activity } from './academic.entity';

@ObjectType()
export class Activities {
  @Field(() => [Activity])
  activities!: Activity[];

  @Field(() => Meta)
  meta!: Meta;
}
