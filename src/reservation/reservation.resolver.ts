import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Role, Status } from 'generated/prisma/enums';
import { AdminOnly, Roles } from 'src/auth';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { JwtPayloadWithAccess } from 'src/auth/types/jwt-payload.type';
import { PaginationArgs } from 'src/common/dtos';
import { CreateReservationRequestInput } from './dto/create-reservation-request.input';
import { CreateReservationInput } from './dto/create-reservation.input';
import { ReservationsArgs } from './dto/filters.args';
import {
  ReservationRequestsArgs,
  ReservationRequestsArgsAll,
} from './dto/reservation-requests.args';
import { ReviewReservationRequestInput } from './dto/review-reservation-request.input';
import { UpdateReservationInput } from './dto/update-reservation.input';
import {
  ReservationRequest,
  ReservationRequestsResponse,
} from './entities/reservation-request.entity';
import { Reservation } from './entities/reservation.entity';
import { Reservations } from './entities/reservations.entity';
import { ReservationService } from './reservation.service';

@Resolver(() => Reservation)
export class ReservationResolver {
  constructor(private readonly reservationService: ReservationService) {}

  // ─── Reservation CRUD (Admin) ─────────────────────────────────────────

  @AdminOnly()
  @Mutation(() => Reservation, { name: 'createReservation' })
  createReservation(
    @Args('createReservationInput')
    createReservationInput: CreateReservationInput,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.reservationService.create(createReservationInput, user.sub);
  }

  @AdminOnly()
  @Query(() => Reservations, { name: 'findAllReservations' })
  findAll(@Args() reservationsArgs: ReservationsArgs) {
    return this.reservationService.findAll(
      reservationsArgs.page,
      reservationsArgs.pageSize,
      reservationsArgs.orderBy,
      reservationsArgs.search,
      reservationsArgs.filters,
    );
  }

  @AdminOnly()
  @Mutation(() => Reservation, { name: 'updateReservation' })
  updateReservation(
    @Args('updateReservationInput')
    updateReservationInput: UpdateReservationInput,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.reservationService.update(updateReservationInput, user.sub);
  }

  @AdminOnly()
  @Mutation(() => Boolean, { name: 'removeReservations' })
  removeReservation(
    @Args('ids', { type: () => [Int] }) ids: number[],
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.reservationService.remove(ids, user.sub);
  }

  @AdminOnly()
  @Mutation(() => Boolean, { name: 'changeStatusReservation' })
  changeStatusReservation(
    @Args('ids', { type: () => [Int] }) ids: number[],
    @Args('status', { type: () => String }) status: Status,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.reservationService.changeStatusReservation(
      ids,
      status,
      user.sub,
    );
  }

  // ─── Public / Member Queries ────────────────────────────────────────

  @Query(() => [Reservation], { name: 'getReservationsFromWebsite' })
  getReservationsFromWebsite() {
    return this.reservationService.findAllFromWeb();
  }

  @Query(() => Reservation, { name: 'findOneReservation' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.reservationService.findOne(id);
  }

  // ─── ReservationRequest ──────────────────────────────────────────────

  @Roles(Role.MEMBER)
  @Mutation(() => ReservationRequest, { name: 'createReservationRequest' })
  createReservationRequest(
    @Args('createReservationRequestInput') input: CreateReservationRequestInput,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.reservationService.createRequest(input, user.sub);
  }

  @AdminOnly()
  @Query(() => ReservationRequestsResponse, {
    name: 'findAllReservationRequests',
  })
  findAllRequests(@Args() args: ReservationRequestsArgs) {
    return this.reservationService.findAllRequests(
      args.reservationId,
      args.page,
      args.pageSize,
      args.status,
    );
  }

  @AdminOnly()
  @Query(() => ReservationRequestsResponse, {
    name: 'findAllRequestWithoutReservation',
  })
  findAllRequestWithOutReservation(@Args() args: ReservationRequestsArgsAll) {
    return this.reservationService.findAllRequestWithOutReservation(
      args.page,
      args.pageSize,
      args.status,
    );
  }

  @Query(() => ReservationRequestsResponse, {
    name: 'findMyReservationRequests',
  })
  findMyRequests(
    @Args() pagination: PaginationArgs,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.reservationService.findMyRequests(
      user.sub,
      pagination.page,
      pagination.pageSize,
    );
  }

  @AdminOnly()
  @Mutation(() => ReservationRequest, { name: 'reviewReservationRequest' })
  reviewRequest(
    @Args('reviewReservationRequestInput') input: ReviewReservationRequestInput,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.reservationService.reviewRequest(input, user.sub);
  }

  @Mutation(() => ReservationRequest, { name: 'cancelReservationRequest' })
  cancelRequest(
    @Args('id', { type: () => String }) id: string,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.reservationService.cancelRequest(id, user.sub);
  }
}
