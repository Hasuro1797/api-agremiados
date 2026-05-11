import { ObjectType, Field, Int, Float } from '@nestjs/graphql';
import { SpaceType, Status } from 'generated/prisma/enums';
import GraphQLJSON from 'graphql-type-json';
import { Media } from 'src/media/entities/media.entity';

@ObjectType()
export class ReservationImage {
  @Field(() => Int)
  order!: number;

  @Field(() => Media)
  media!: Media;
}

@ObjectType()
export class Reservation {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  title!: string;

  @Field(() => GraphQLJSON, { nullable: true })
  description?: any;

  @Field(() => String, { nullable: true })
  location?: string;

  @Field(() => String, { nullable: true })
  address?: string;

  @Field(() => String)
  spaceType!: SpaceType;

  @Field(() => Float, { nullable: true })
  pricePerHour?: number;

  @Field(() => Float, { nullable: true })
  price?: number;

  @Field(() => [String], { nullable: true })
  amenities?: any;

  @Field(() => GraphQLJSON, { nullable: true })
  rules?: any;

  @Field(() => Int)
  capacity!: number;

  @Field(() => String)
  status!: Status;

  @Field(() => [ReservationImage])
  images!: ReservationImage[];

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
