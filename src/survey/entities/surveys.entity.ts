import { Field, ObjectType } from '@nestjs/graphql';
import { Meta } from 'src/common/entities/meta.entity';
import { Survey } from './survey.entity';

@ObjectType()
export class Surveys {
  @Field(() => [Survey])
  surveys!: Survey[];

  @Field(() => Meta)
  meta!: Meta;
}
