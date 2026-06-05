import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { NotificationChannel } from 'generated/prisma/enums';

/** A quién se dirige un comunicado manual del admin. */
export enum AnnouncementAudience {
  ALL_MEMBERS = 'ALL_MEMBERS', // todos los agremiados (cualquier estado)
  ACTIVE_MEMBERS = 'ACTIVE_MEMBERS', // solo agremiados ACTIVE
  SPECIFIC = 'SPECIFIC', // lista explícita de userIds
}

registerEnumType(AnnouncementAudience, {
  name: 'AnnouncementAudience',
  description: 'Destinatarios de un comunicado manual',
});

@InputType()
export class SendAnnouncementInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  subject!: string;

  @Field(() => String, {
    description: 'Cuerpo del mensaje (HTML simple permitido)',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  message!: string;

  @Field(() => [NotificationChannel], {
    description: 'Canales: solo IN_APP y/o EMAIL',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn([NotificationChannel.IN_APP, NotificationChannel.EMAIL], { each: true })
  channels!: NotificationChannel[];

  @Field(() => AnnouncementAudience)
  @IsEnum(AnnouncementAudience)
  audience!: AnnouncementAudience;

  @Field(() => [String], {
    nullable: true,
    description: 'IDs de usuarios (requerido si audience = SPECIFIC)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];

  @Field(() => String, {
    nullable: true,
    description: 'Ruta relativa opcional para navegar al hacer click',
  })
  @IsOptional()
  @IsString()
  link?: string;
}
