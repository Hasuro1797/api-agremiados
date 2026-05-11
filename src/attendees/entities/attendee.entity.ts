import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { AttendeeType } from 'generated/prisma/enums';
import { Member } from 'src/members/entities/member.entity';
import { Meta } from 'src/common/entities/meta.entity';

registerEnumType(AttendeeType, {
  name: 'AttendeeType',
  description: 'Tipo de asistente a una actividad',
});

@ObjectType()
export class AttendeeEntity {
  @Field(() => String)
  id!: string;

  @Field(() => Int)
  activityId!: number;

  @Field(() => AttendeeType)
  attendeeType!: AttendeeType;

  @Field(() => String)
  status!: string;

  @Field(() => Boolean)
  attendanceConfirmed!: boolean;

  // --- Ruta miembro ---
  @Field(() => String, { nullable: true })
  userId?: string;

  @Field(() => Member, { nullable: true })
  user?: Member;

  // --- Ruta no-miembro (invitado o externo) ---
  @Field(() => String, { nullable: true })
  documentType?: string;

  @Field(() => String, { nullable: true })
  documentNumber?: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  lastname?: string;

  @Field(() => String, { nullable: true })
  email?: string;

  @Field(() => String, { nullable: true })
  phone?: string;

  // --- Sponsor (solo INVITED) ---
  @Field(() => String, { nullable: true })
  sponsorAttendeeId?: string;

  @Field(() => [AttendeeEntity], { nullable: true })
  sponsoredGuests?: AttendeeEntity[];

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType()
export class AttendeesResponse {
  @Field(() => [AttendeeEntity])
  attendees!: AttendeeEntity[];

  @Field(() => Meta)
  meta!: Meta;
}
