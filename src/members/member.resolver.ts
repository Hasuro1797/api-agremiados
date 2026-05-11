import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UserStatus } from 'generated/prisma/enums';
import { AdminOnly } from 'src/auth';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { JwtPayloadWithAccess } from 'src/auth/types/jwt-payload.type';
import { MemberService } from './member.service';
import { CreateMemberInput, FilterMemberArgs, UpdateMemberInput } from './dto';
import { Member } from './entities/member.entity';
import { MembersResponse } from './entities/members.entity';
import { StatusMember } from './entities/status-member.entity';

@Resolver()
export class MemberResolver {
  constructor(private readonly memberService: MemberService) {}

  @AdminOnly()
  @Mutation(() => Member, {
    name: 'createMember',
    description: 'Crear un nuevo agremiado',
  })
  createMember(
    @Args('input') input: CreateMemberInput,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.memberService.create(input, user.sub);
  }

  @AdminOnly()
  @Query(() => MembersResponse, {
    name: 'findAllMembers',
    description:
      'Obtener lista de agremiados con paginación, ordenamiento, búsqueda y filtros',
  })
  findAll(@Args() args: FilterMemberArgs) {
    return this.memberService.findAll(
      args.page,
      args.pageSize,
      args.filters,
      args.orderBy,
      args.search,
    );
  }

  @AdminOnly()
  @Query(() => Member, {
    name: 'findOneMember',
    description: 'Obtener un agremiado por su ID',
  })
  findOne(@Args('id', { type: () => String }) id: string) {
    return this.memberService.findOne(id);
  }

  @AdminOnly()
  @Mutation(() => Member, {
    name: 'updateMember',
    description: 'Actualizar un agremiado existente',
  })
  updateMember(
    @Args('input') input: UpdateMemberInput,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.memberService.update(input, user.sub);
  }

  @AdminOnly()
  @Mutation(() => Boolean, {
    name: 'removeMembers',
    description: 'Eliminar uno o más agremiados',
  })
  removeMembers(
    @Args('ids', { type: () => [String] }) ids: string[],
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.memberService.remove(ids, user.sub);
  }

  @AdminOnly()
  @Mutation(() => Boolean, {
    name: 'changeStatusMember',
    description: 'Cambiar el estado de uno o más agremiados',
  })
  changeStatusMember(
    @Args('ids', { type: () => [String] }) ids: string[],
    @Args('status', { type: () => String }) status: UserStatus,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.memberService.changeStatus(ids, status, user.sub);
  }

  @Query(() => StatusMember, {
    name: 'getStatusMember',
    description: 'Obtener los posibles estados de un agremiado',
  })
  getStatusMember(@CurrentUser('sub') userId: string) {
    return this.memberService.getStatusMember(userId);
  }
}
