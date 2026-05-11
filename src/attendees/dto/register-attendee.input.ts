import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsPositive, IsUUID } from 'class-validator';

@InputType()
export class RegisterAttendeeInput {
  @Field(() => String, {
    description: 'ID del usuario (agremiado) a registrar',
  })
  @IsNotEmpty()
  @IsUUID()
  userId!: string;

  @Field(() => Int, { description: 'ID de la actividad' })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  activityId!: number;
}
