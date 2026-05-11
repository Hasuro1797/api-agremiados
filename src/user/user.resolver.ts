import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Role, UserStatus } from 'generated/prisma/enums';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { JwtPayloadWithAccess } from 'src/auth/types/jwt-payload.type';
import { UserProfile } from 'src/auth/types';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { FilterUserArgs } from './dto/userFilter.args';
import { UsersResponse } from './entities/users.entity';
import { UserService } from './user.service';

@Resolver()
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Roles(Role.SUPERADMIN)
  @Mutation(() => UserProfile, {
    name: 'createUser',
    description: 'Crear un nuevo usuario. Solo accesible para SUPERADMIN',
  })
  createUser(
    @Args('createUserInput') createUserInput: CreateUserInput,
    @Args('role', { type: () => String }) role: Role,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.userService.create(createUserInput, role, user.sub);
  }

  @Roles(Role.SUPERADMIN)
  @Query(() => UsersResponse, {
    name: 'findAllUsers',
    description:
      'Obtener lista de usuarios con paginación, ordenamiento y búsqueda',
  })
  findAll(@Args() userArgs: FilterUserArgs) {
    return this.userService.findAll(
      userArgs.page,
      userArgs.pageSize,
      userArgs.orderBy,
      userArgs.search,
    );
  }

  @Roles(Role.SUPERADMIN)
  @Query(() => UserProfile, {
    name: 'findUserById',
    description: 'Obtener un usuario por su ID',
  })
  findOne(@Args('id', { type: () => String }) id: string) {
    return this.userService.findOne(id);
  }

  @Roles(Role.SUPERADMIN)
  @Mutation(() => UserProfile, {
    name: 'updateUser',
    description: 'Actualizar un usuario existente',
  })
  updateUser(
    @Args('updateUserInput') updateUserInput: UpdateUserInput,
    @Args('role', { type: () => String }) role: Role,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.userService.update(
      updateUserInput.id,
      updateUserInput,
      role,
      user.sub,
    );
  }

  @Roles(Role.SUPERADMIN)
  @Mutation(() => Boolean, {
    name: 'removeUser',
    description: 'Eliminar uno o más usuarios',
  })
  removeUser(
    @Args('ids', { type: () => [String] }) ids: string[],
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.userService.remove(ids, user.sub);
  }

  @Roles(Role.SUPERADMIN)
  @Mutation(() => Boolean, {
    name: 'changeStatusUser',
    description: 'Cambiar el estado de uno o más usuarios',
  })
  changeStatusUser(
    @Args('ids', { type: () => [String] }) ids: string[],
    @Args('status', { type: () => String }) status: UserStatus,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.userService.changeUserStatus(ids, status, user.sub);
  }
}
