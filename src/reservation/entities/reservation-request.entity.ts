import { ObjectType, Field, Int, Float } from '@nestjs/graphql';
import { ReservationRequestStatus } from 'generated/prisma/enums';
import { Reservation } from './reservation.entity';
import { Meta } from 'src/common/entities/meta.entity';

@ObjectType()
export class RequestUser {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  paternalSurname!: string;

  @Field(() => String, { nullable: true })
  email?: string;
}

@ObjectType()
export class ReservationRequest {
  @Field(() => String)
  id!: string;

  @Field(() => Int)
  reservationId!: number;

  @Field(() => String)
  userId!: string;

  @Field(() => String)
  eventName!: string;

  @Field(() => String, { nullable: true })
  purpose?: string;

  @Field(() => Int)
  guestCount!: number;

  @Field(() => Date)
  startDate!: Date;

  @Field(() => Date)
  endDate!: Date;

  @Field(() => String)
  status!: ReservationRequestStatus;

  @Field(() => String, { nullable: true })
  adminComment?: string;

  @Field(() => Date, { nullable: true })
  reviewedAt?: Date;

  @Field(() => String, { nullable: true })
  reviewedBy?: string;

  @Field(() => Float, { nullable: true })
  estimatedPrice?: number;

  @Field(() => String, { nullable: true })
  invoiceId?: string;

  @Field(() => RequestUser, { nullable: true })
  user?: RequestUser;

  @Field(() => Reservation, { nullable: true })
  reservation?: Reservation;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType()
export class ReservationRequestsResponse {
  @Field(() => [ReservationRequest])
  requests!: ReservationRequest[];

  @Field(() => Meta)
  meta!: Meta;
}
