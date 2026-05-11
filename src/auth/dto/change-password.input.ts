import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

@InputType()
export class ChangePasswordInput {
  @Field()
  @IsNotEmpty({ message: 'La contraseña actual es requerida' })
  @IsString()
  currentPassword!: string;

  @Field()
  @IsNotEmpty({ message: 'La nueva contraseña es requerida' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
  })
  newPassword!: string;
}
