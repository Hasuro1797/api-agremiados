import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class Izipay {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
