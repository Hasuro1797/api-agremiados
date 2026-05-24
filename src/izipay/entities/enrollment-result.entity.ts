import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class EnrollmentResultEntity {
  @Field(() => String)
  attendeeId!: string;

  @Field(() => Int)
  activityId!: number;

  @Field(() => String, { description: 'Estado de la inscripción (ACEPTADO)' })
  status!: string;

  @Field(() => String, { description: 'Mensaje para mostrar al usuario' })
  message!: string;
}
