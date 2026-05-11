import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  ValidateIf,
} from 'class-validator';
import { AttendeeType, DocumentType } from 'generated/prisma/enums';

@InputType()
export class AddNonMemberInput {
  @Field(() => Int, { description: 'ID de la actividad' })
  @IsInt()
  @IsPositive()
  activityId!: number;

  @Field(() => AttendeeType, {
    description: 'INVITED (traído por un miembro) o EXTERNAL (externo directo)',
  })
  @IsEnum(AttendeeType)
  attendeeType!: AttendeeType;

  @Field(() => String, { description: 'Tipo de documento' })
  @IsEnum(DocumentType)
  documentType!: DocumentType;

  @Field(() => String, { description: 'Número de documento' })
  @IsNotEmpty()
  @IsString()
  @Length(6, 20)
  documentNumber!: string;

  @Field(() => String, { description: 'Nombre' })
  @IsNotEmpty()
  @IsString()
  @Length(2, 100)
  name!: string;

  @Field(() => String, { nullable: true, description: 'Apellido' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  lastname?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field(() => String, {
    nullable: true,
    description:
      'ID del ActivityAttendee sponsor (requerido si attendeeType=INVITED)',
  })
  @ValidateIf((o: AddNonMemberInput) => o.attendeeType === AttendeeType.INVITED)
  @IsNotEmpty({ message: 'sponsorAttendeeId es requerido para invitados' })
  @IsUUID()
  sponsorAttendeeId?: string;
}
