import { Field, ObjectType } from '@nestjs/graphql';
import { Meta } from 'src/common/entities/meta.entity';
import { Agreement } from './agreement.entity';

@ObjectType()
export class Agreements {
  @Field(() => [Agreement])
  agreements!: Agreement[];

  @Field(() => Meta)
  meta!: Meta;
}
