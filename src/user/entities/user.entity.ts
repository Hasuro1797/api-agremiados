import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class User {
  @Field(() => String, {
    description: 'Identificador único del usuario',
  })
  id!: string;

  // @Field(() => String, {
  //   description: 'Email del usuario',
  // })
  // email: string;

  // @Field(() => String, {
  //   description: 'Nombre del usuario',
  // })
  // name: string;

  // @Field(() => String, {
  //   description: 'Apellido paterno del usuario',
  // })
  // paternalSurname: string;

  // @Field(() => String, {
  //   description: 'Apellido materno del usuario',
  // })
  // maternalSurname: string;

  // @Field(() => String, {
  //   description: 'Rol del usuario',
  // })
  // role: Roles;

  // @Field(() => String, {
  //   description: 'Phone number of the user',
  // })
  // status: Status;

  // @Field(() => Date, {
  //   description: 'Date the user was created',
  // })
  // createdAt: Date;

  // @Field(() => Date, {
  //   description: 'Date the user was last updated',
  // })
  // updatedAt: Date;
}
