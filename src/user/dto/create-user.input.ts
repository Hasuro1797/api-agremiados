import { Field, InputType } from '@nestjs/graphql';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';

@InputType()
export class CreateUserInput {
  @Field(() => String, {
    description: 'Email del usuario, admin o superadmin',
  })
  @IsNotEmpty({ message: 'Email es requerido' })
  @IsEmail({}, { message: 'Email debe ser un email válido' })
  email!: string;

  @Field(() => String, {
    description: 'Apellido paterno del usuario, admin o superadmin',
  })
  @IsNotEmpty({ message: 'Apellido paterno es requerido' })
  @IsString({ message: 'Apellido paterno debe ser una cadena de texto' })
  @Length(3, 50, {
    message: 'Apellido paterno debe tener entre 3 y 50 caracteres',
  })
  paternalSurname!: string;

  @Field(() => String, {
    description: 'Apellido materno del usuario, admin o superadmin',
  })
  @IsNotEmpty({ message: 'Apellido materno es requerido' })
  @IsString({ message: 'Apellido materno debe ser una cadena de texto' })
  @Length(3, 50, {
    message: 'Apellido materno debe tener entre 3 y 50 caracteres',
  })
  maternalSurname!: string;

  @Field(() => String, {
    description: 'Nombre del usuario, admin o superadmin',
  })
  @IsNotEmpty({ message: 'Nombre es requerido' })
  @IsString({ message: 'Nombre debe ser una cadena de texto' })
  @Length(3, 50, { message: 'Nombre debe tener entre 3 y 50 caracteres' })
  name!: string;

  @Field(() => String, {
    description: 'Password del usuario, admin o superadmin',
  })
  @IsNotEmpty({ message: 'Password es requerido' })
  @IsString({ message: 'Password debe ser una cadena de texto' })
  @Length(8, undefined, {
    message: 'Password debe tener al menos 8 caracteres',
  })
  @Matches(/^(?=.*[A-Z])(?=.*[^\w\s#<>]).{8,}$/, {
    message:
      'Password debe contener al menos una letra mayúscula, un carácter especial (excluyendo #, <, >), y tener al menos 8 caracteres',
  })
  password!: string;
}
