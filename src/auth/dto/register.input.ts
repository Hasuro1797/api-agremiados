import { InputType, Field } from '@nestjs/graphql';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Matches,
  MaxLength,
  Length,
} from 'class-validator';

@InputType()
export class RegisterInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsEmail({}, { message: 'El email no es válido' })
  email?: string;

  @Field()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
  })
  password!: string;

  @Field()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString()
  name!: string;

  @Field()
  @IsNotEmpty({ message: 'El apellido paterno es requerido' })
  @IsString()
  paternalSurname!: string;

  @Field()
  @IsNotEmpty({ message: 'El apellido materno es requerido' })
  @IsString()
  maternalSurname!: string;

  @Field()
  @IsNotEmpty({ message: 'El DNI es requerido' })
  @IsString()
  @MinLength(8, { message: 'El DNI debe tener 8 caracteres' })
  @MaxLength(8, { message: 'El DNI debe tener 8 caracteres' })
  dni!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;
}

@InputType()
export class CreateUserAdminInput {
  @Field(() => String, {
    description: 'Email de usuario, admin o superadmin',
  })
  @IsNotEmpty({ message: 'El email es requerido' })
  @IsEmail({}, { message: 'El email debe ser válido' })
  email!: string;

  @Field(() => String, {
    description: 'Apellido paterno del usuario, admin o superadmin',
  })
  @IsNotEmpty({ message: 'El apellido paterno es requerido' })
  @IsString({ message: 'El apellido paterno debe ser una cadena de texto' })
  @Length(3, 50, {
    message: 'El apellido paterno debe tener entre 3 y 50 caracteres',
  })
  paternalSurname!: string;

  @Field(() => String, {
    description: 'Apellido materno del usuario, admin o superadmin',
  })
  @IsNotEmpty({ message: 'El apellido materno es requerido' })
  @IsString({ message: 'El apellido materno debe ser una cadena de texto' })
  @Length(3, 50, {
    message: 'El apellido materno debe tener entre 3 y 50 caracteres',
  })
  maternalSurname!: string;

  @Field(() => String, {
    description: 'Nombre del usuario, admin o superadmin',
  })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @Length(3, 50, { message: 'El nombre debe tener entre 3 y 50 caracteres' })
  name!: string;

  @Field(() => String, {
    description: 'Contraseña del usuario, admin o superadmin',
  })
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @Length(8, undefined, {
    message: 'La contraseña debe tener al menos 8 caracteres',
  })
  @Matches(/^(?=.*[A-Z])(?=.*[^\w\s#<>]).{8,}$/, {
    message:
      'La contraseña debe contener al menos una letra mayúscula, un carácter especial (excluyendo #, <, >) y tener al menos 8 caracteres',
  })
  password!: string;

  @Field(() => String, {
    description: 'Confirmación de contraseña del usuario, admin o superadmin',
  })
  @IsNotEmpty({ message: 'La confirmación de contraseña es requerida' })
  @IsString({
    message: 'La confirmación de contraseña debe ser una cadena de texto',
  })
  @Length(8, undefined, {
    message: 'La confirmación de contraseña debe tener al menos 8 caracteres',
  })
  @Matches(/^(?=.*[A-Z])(?=.*[^\w\s#<>]).{8,}$/, {
    message:
      'La confirmación de contraseña debe contener al menos una letra mayúscula, un carácter especial (excluyendo #, <, >) y tener al menos 8 caracteres',
  })
  confirmPassword!: string;
}
