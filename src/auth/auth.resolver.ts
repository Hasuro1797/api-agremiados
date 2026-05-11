import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthResponse, MessageResponse, UserProfile } from './types/index';
import {
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  CreateUserAdminInput,
} from './dto/index.js';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator.js';
import { GqlRefreshTokenGuard } from './guards/gql-refresh-token.guard';
import type { JwtPayloadWithRefresh } from './types/index';
import type { JwtPayloadWithAccess } from './types/jwt-payload.type';

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  // ─── PUBLIC: Login para agremiados ─────────────────────────
  @Public()
  @Mutation(() => AuthResponse, {
    name: 'signinMember',
    description: 'Login para agremiados. Acepta email o DNI como identificador',
  })
  async login(@Args('input') input: LoginInput): Promise<AuthResponse> {
    return this.authService.login(input);
  }

  // ─── PUBLIC: Login para administración ─────────────────────
  @Public()
  @Mutation(() => AuthResponse, {
    name: 'signinAdmin',
    description:
      'Login exclusivo para administradores (SUPERADMIN, ADMIN, MODERATOR, ETC)',
  })
  async loginAdmin(
    @Args('signinAdminInput') input: LoginInput,
  ): Promise<AuthResponse> {
    return this.authService.loginAdmin(input);
  }

  // ─── PUBLIC: Verificar si ya hay usuarios registrados ───────
  @Public()
  @Query(() => Boolean, {
    name: 'haveAdminRegister',
    description: 'Verificar si ya hay administradores registrados',
  })
  async haveAdminRegister() {
    const countUser = await this.authService.countSuperAdmins();
    return countUser > 0;
  }

  // ─── PRIVATE: Verificar si miembro ya se encuentra registrado ───────
  @Query(() => Boolean, {
    name: 'isMemberRegistered',
    description: 'Verificar si un miembro ya se encuentra registrado',
  })
  async isMemberRegistered(@CurrentUser('sub') userId: string) {
    return this.authService.wasMemberRegistered(userId);
  }

  // ─── PUBLIC: Registro de agremiados ────────────────────────
  @Public()
  @Mutation(() => AuthResponse, {
    description:
      'Registro de nuevos agremiados o completar registro para pre-registrados',
  })
  async register(@Args('input') input: RegisterInput): Promise<AuthResponse> {
    return this.authService.register(input);
  }

  // ─── PROTECTED: Registro de administradores ─────────────────
  @Public()
  @Mutation(() => AuthResponse, {
    description: 'Registro del SUPERADMIN',
    name: 'registerSuperAdmin',
  })
  async registerSuperAdmin(
    @Args('signupAdminInput') input: CreateUserAdminInput,
  ): Promise<AuthResponse> {
    return this.authService.registerSuperAdmin(input);
  }
  // ─── PROTECTED: Refresh tokens ────────────────────────────
  @Public()
  @UseGuards(GqlRefreshTokenGuard)
  @Mutation(() => AuthResponse, {
    name: 'refreshTokens',
    description: 'Obtener nuevos tokens usando el refresh token',
  })
  async refreshTokens(
    @CurrentUser() user: JwtPayloadWithRefresh,
  ): Promise<AuthResponse> {
    return this.authService.refreshTokens(user.sub, user.refreshToken);
  }

  // ─── PROTECTED: Logout ────────────────────────────────────
  @Mutation(() => MessageResponse, {
    name: 'signout',
    description: 'Cerrar sesión y revocar tokens',
  })
  async logout(
    @CurrentUser() user: JwtPayloadWithAccess,
  ): Promise<MessageResponse> {
    return this.authService.logout(user.sub, user.accessToken);
  }

  // ─── PUBLIC: Forgot password ──────────────────────────────
  @Public()
  @Mutation(() => MessageResponse, {
    name: 'forgotPassword',
    description: 'Solicitar recuperación de contraseña. Envía email con enlace',
  })
  async forgotPassword(
    @Args('input') input: ForgotPasswordInput,
  ): Promise<MessageResponse> {
    return this.authService.forgotPassword(input);
  }

  // ─── PUBLIC: Reset password ───────────────────────────────
  @Public()
  @Mutation(() => MessageResponse, {
    name: 'resetPassword',
    description: 'Restablecer contraseña usando el token de recuperación',
  })
  async resetPassword(
    @Args('resetPasswordInput') input: ResetPasswordInput,
  ): Promise<MessageResponse> {
    return this.authService.resetPassword(input);
  }

  // ─── PROTECTED: Change password ───────────────────────────
  @Mutation(() => MessageResponse, {
    description: 'Cambiar contraseña del usuario autenticado',
  })
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Args('input') input: ChangePasswordInput,
  ): Promise<MessageResponse> {
    return this.authService.changePassword(userId, input);
  }

  // ─── PROTECTED: Me ────────────────────────────────────────
  @Query(() => UserProfile, {
    name: 'me',
    description: 'Obtener perfil del usuario autenticado',
  })
  async me(@CurrentUser('sub') userId: string) {
    return this.authService.me(userId);
  }
}
