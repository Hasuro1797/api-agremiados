import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

@InputType()
export class ForgotPasswordInput {
  @Field({ description: 'Email o DNI del usuario' })
  @IsNotEmpty({ message: 'El identificador es requerido' })
  @IsString()
  identifier!: string;
}

@InputType()
export class ResetPasswordInput {
  @Field()
  @IsNotEmpty({ message: 'El token es requerido' })
  @IsString()
  token!: string;

  @Field()
  @IsNotEmpty({ message: 'El identificador es requerido' })
  @IsString()
  identifier!: string;

  @Field()
  @IsNotEmpty({ message: 'La nueva contraseña es requerida' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
  })
  newPassword!: string;

  @Field()
  @IsNotEmpty({ message: 'La confirmación de contraseña es requerida' })
  @IsString()
  @MinLength(8, {
    message: 'La confirmación de contraseña debe tener al menos 8 caracteres',
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'La confirmación de contraseña debe contener al menos una mayúscula, una minúscula y un número',
  })
  confirmNewPassword!: string;
}
