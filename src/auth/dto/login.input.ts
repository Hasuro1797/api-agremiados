import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

@InputType()
export class LoginInput {
  @Field({ description: 'Email o DNI del usuario' })
  @IsNotEmpty({ message: 'El identificador es requerido' })
  @IsString()
  identifier!: string;

  @Field()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password!: string;
}
