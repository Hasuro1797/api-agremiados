import { Field, ObjectType } from '@nestjs/graphql';
import { Meta } from 'src/common/entities/meta.entity';
import { Reservation } from './reservation.entity';

@ObjectType()
export class Reservations {
  @Field(() => [Reservation])
  reservations!: Reservation[];

  @Field(() => Meta)
  meta!: Meta;
}
