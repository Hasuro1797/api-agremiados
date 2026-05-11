import { Field, InputType } from '@nestjs/graphql';
import {
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

@InputType()
export class CreateMemberInput {
  @Field(() => String)
  @IsNotEmpty({ message: 'Email es requerido' })
  @IsEmail({}, { message: 'Email debe ser un email válido' })
  email!: string;

  @Field(() => String)
  @IsNotEmpty({ message: 'Nombre es requerido' })
  @IsString()
  @Length(2, 100)
  name!: string;

  @Field(() => String)
  @IsNotEmpty({ message: 'Apellido paterno es requerido' })
  @IsString()
  @Length(2, 100)
  paternalSurname!: string;

  @Field(() => String)
  @IsNotEmpty({ message: 'Apellido materno es requerido' })
  @IsString()
  @Length(2, 100)
  maternalSurname!: string;

  @Field(() => String)
  @IsNotEmpty({ message: 'Password es requerido' })
  @IsString()
  @Length(8, undefined, {
    message: 'Password debe tener al menos 8 caracteres',
  })
  @Matches(/^(?=.*[A-Z])(?=.*[^\w\s#<>]).{8,}$/, {
    message:
      'Password debe contener al menos una letra mayúscula, un carácter especial y tener al menos 8 caracteres',
  })
  password!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  dni?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  memberCode?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDate()
  birthdate?: Date;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  address?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  district?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  province?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  department?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  country?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Categoría: REGULAR, JUBILADO, VITALICIO, HONORARIO',
  })
  @IsOptional()
  @IsString()
  memberCategory?: string;
}
