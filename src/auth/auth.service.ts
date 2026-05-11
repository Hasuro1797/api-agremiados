import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from 'src/db/prisma.service';
import { EnvConfig } from 'src/config/index';
import { MailService } from 'src/mail/mail.service';
import { JwtPayload } from './types/index';
import {
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  CreateUserAdminInput,
} from './dto/index.js';
import { Role, UserStatus } from 'generated/prisma/enums';
import { AuditLogService } from 'src/audit-log/audit-log.service';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService<EnvConfig>,
    private mailService: MailService,
    private auditLog: AuditLogService,
  ) {}

  // ─── LOGIN ───────────────────────────────────────────────
  async login(input: LoginInput) {
    const { identifier, password } = input;

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { dni: identifier }],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenException(
        'Tu cuenta está inactiva. Contacta al administrador',
      );
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('Tu cuenta está suspendida por sanción');
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new ForbiddenException(
        'Tu cuenta está bloqueada por mora. Regulariza tus pagos',
      );
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      role: user.role,
    });

    await this.updateRefreshToken(user.id, tokens.refresh_token);

    await this.auditLog.log({
      userId: user.id,
      action: 'LOGIN',
      entity: 'auth',
      details: { method: 'member' },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email ?? undefined,
        name: user.name,
        paternalSurname: user.paternalSurname,
        maternalSurname: user.maternalSurname,
        dni: user.dni ?? undefined,
        memberCode: user.memberCode ?? undefined,
        role: user.role,
        status: user.status,
      },
    };
  }

  // ─── LOGIN ADMIN ──────────────────────────────────────────
  async loginAdmin(input: LoginInput) {
    const { identifier, password } = input;

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { dni: identifier }],
        role: { in: [Role.SUPERADMIN, Role.ADMIN, Role.MODERATOR] },
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Credenciales inválidas o sin permisos de administración',
      );
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Tu cuenta no está activa');
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException(
        'Credenciales inválidas o sin permisos de administración',
      );
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      role: user.role,
    });

    await this.updateRefreshToken(user.id, tokens.refresh_token);

    await this.auditLog.log({
      userId: user.id,
      action: 'LOGIN',
      entity: 'auth',
      details: { method: 'admin' },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email ?? undefined,
        name: user.name,
        paternalSurname: user.paternalSurname,
        maternalSurname: user.maternalSurname,
        dni: user.dni ?? undefined,
        memberCode: user.memberCode ?? undefined,
        role: user.role,
        status: user.status,
      },
    };
  }

  // ─── REGISTER ──────────────────────────────────────────────
  async register(input: RegisterInput) {
    const { password, dni, email, ...rest } = input;

    // Check if user already exists with this DNI (pre-registered by admin)
    const existingUser = await this.prisma.user.findUnique({
      where: { dni },
    });

    if (existingUser && existingUser.hasRegistered) {
      throw new ConflictException(
        'Ya existe una cuenta registrada con este DNI',
      );
    }

    if (email) {
      const emailTaken = await this.prisma.user.findUnique({
        where: { email },
      });
      if (emailTaken && emailTaken.id !== existingUser?.id) {
        throw new ConflictException('El email ya está en uso');
      }
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    let user;

    if (existingUser) {
      // User was pre-registered by admin, complete registration
      user = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          ...rest,
          email,
          password: hashedPassword,
          hasRegistered: true,
          acceptedTerms: true,
        },
      });
    } else {
      // New self-registration
      user = await this.prisma.user.create({
        data: {
          ...rest,
          email,
          dni,
          password: hashedPassword,
          role: Role.MEMBER,
          hasRegistered: true,
          acceptedTerms: true,
        },
      });
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      role: user.role,
    });

    await this.updateRefreshToken(user.id as string, tokens.refresh_token);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email ?? undefined,
        name: user.name,
        paternalSurname: user.paternalSurname,
        maternalSurname: user.maternalSurname,
        dni: user.dni,
        memberCode: user.memberCode ?? undefined,
        role: user.role,
        status: user.status,
      },
    };
  }

  async registerSuperAdmin(input: CreateUserAdminInput) {
    const { email, password, confirmPassword, ...rest } = input;
    if (password !== confirmPassword) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }
    const countSuperAdmins = await this.prisma.user.count({
      where: { role: Role.SUPERADMIN },
    });
    if (countSuperAdmins > 0) {
      throw new ForbiddenException(
        'Ya existe un SUPERADMIN registrado. No se pueden crear más SUPERADMIN',
      );
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        ...rest,
        email,
        role: Role.SUPERADMIN,
        password: hashedPassword,
      },
    });

    const tokens = await this.generateTokens({
      sub: user.id,
      role: user.role,
    });

    await this.updateRefreshToken(user.id, tokens.refresh_token);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email ?? undefined,
        name: user.name,
        paternalSurname: user.paternalSurname,
        maternalSurname: user.maternalSurname,
        dni: user.dni ?? undefined,
        memberCode: user.memberCode ?? undefined,
        role: user.role,
        status: user.status,
      },
    };
  }

  // ─── REFRESH TOKENS ────────────────────────────────────────
  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException(
        'Acceso denegado. Inicia sesión nuevamente',
      );
    }

    const refreshTokenValid = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );
    if (!refreshTokenValid) {
      throw new UnauthorizedException(
        'Refresh token inválido. Inicia sesión nuevamente',
      );
    }

    // Revoke the old refresh token
    await this.prisma.revokedToken.create({
      data: { token: refreshToken },
    });

    const tokens = await this.generateTokens({
      sub: user.id,
      role: user.role,
    });

    await this.updateRefreshToken(user.id, tokens.refresh_token);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email ?? undefined,
        name: user.name,
        paternalSurname: user.paternalSurname,
        maternalSurname: user.maternalSurname,
        dni: user.dni ?? undefined,
        memberCode: user.memberCode ?? undefined,
        role: user.role,
        status: user.status,
      },
    };
  }

  // ─── LOGOUT ────────────────────────────────────────────────
  async logout(userId: string, accessToken: string) {
    console.log(
      `Cerrando sesión para usuario ${userId}... Revocando access token: ${accessToken ? 'Sí' : 'No'}`,
    );
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    await this.auditLog.log({
      userId,
      action: 'LOGOUT',
      entity: 'auth',
    });

    // Revoke the access token if provided
    if (accessToken) {
      await this.prisma.revokedToken
        .create({
          data: { token: accessToken },
        })
        .catch(() => {
          // Ignore if token already revoked
        });
    }

    return { message: 'Sesión cerrada exitosamente' };
  }

  // ─── FORGOT PASSWORD ──────────────────────────────────────
  async forgotPassword(input: ForgotPasswordInput) {
    const { identifier } = input;

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { dni: identifier }],
      },
    });

    // Always return success message to prevent user enumeration
    if (!user || !user.email) {
      throw new BadRequestException(
        'Si el usuario existe y tiene email, recibirá un enlace de recuperación',
      );
    }

    // Check if there's an existing non-expired recovery
    const existingRecovery = await this.prisma.recoveryPassword.findUnique({
      where: { identifier: user.email },
    });

    if (existingRecovery && existingRecovery.attempts >= 5) {
      throw new BadRequestException(
        'Has excedido el número máximo de intentos. Intenta más tarde',
      );
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await this.prisma.recoveryPassword.upsert({
      where: { identifier: user.email },
      update: {
        token,
        expiresAt,
        attempts: existingRecovery ? existingRecovery.attempts + 1 : 1,
      },
      create: {
        identifier: user.email,
        token,
        expiresAt,
        attempts: 1,
      },
    });

    const frontendUrl = this.config.get('FRONTEND_URL', { infer: true });
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}&identifier=${encodeURIComponent(user.email)}`;

    try {
      await this.mailService.sendMail({
        to: [user.email],
        subject: 'Recuperación de contraseña',
        template: 'forgotpassword',
        context: {
          name: user.name,
          resetLink: resetUrl,
        },
      });
    } catch (error) {
      this.logger.error('Error enviando email de recuperación', error);
      throw new BadRequestException(
        'Error enviando email de recuperación. Intenta nuevamente más tarde',
      );
    }

    return {
      message:
        'Si el usuario existe y tiene email, recibirá un enlace de recuperación',
    };
  }

  // ─── RESET PASSWORD ───────────────────────────────────────
  async resetPassword(input: ResetPasswordInput) {
    const { token, identifier, newPassword, confirmNewPassword } = input;

    if (newPassword !== confirmNewPassword) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }

    const recovery = await this.prisma.recoveryPassword.findUnique({
      where: {
        identifier_token: { identifier, token },
      },
    });

    if (!recovery) {
      throw new BadRequestException('Token de recuperación inválido');
    }

    if (recovery.expiresAt < new Date()) {
      await this.prisma.recoveryPassword.delete({
        where: { id: recovery.id },
      });
      throw new BadRequestException('El token de recuperación ha expirado');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { dni: identifier }],
      },
    });

    if (!user) {
      throw new BadRequestException('Token de recuperación inválido');
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          refreshToken: null,
        },
      }),
      this.prisma.recoveryPassword.delete({
        where: { id: recovery.id },
      }),
    ]);

    return {
      message:
        'Contraseña actualizada exitosamente. Inicia sesión con tu nueva contraseña',
    };
  }

  // ─── CHANGE PASSWORD ──────────────────────────────────────
  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const passwordValid = await bcrypt.compare(
      input.currentPassword,
      user.password,
    );
    if (!passwordValid) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    const hashedPassword = await bcrypt.hash(input.newPassword, SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Contraseña actualizada exitosamente' };
  }

  async wasMemberRegistered(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user.hasRegistered;
  }

  // ─── ME (current user profile) ────────────────────────────
  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        paternalSurname: true,
        maternalSurname: true,
        dni: true,
        memberCode: true,
        phone: true,
        role: true,
        status: true,
        memberCategory: true,
        birthdate: true,
        address: true,
        district: true,
        province: true,
        department: true,
        country: true,
        createdAt: true,
        profileImage: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async countSuperAdmins() {
    console.log('Contando superadmins...');
    return await this.prisma.user.count({
      where: {
        role: Role.SUPERADMIN,
      },
    });
  }

  // ─── HELPERS ───────────────────────────────────────────────

  private async generateTokens(payload: JwtPayload) {
    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('AT_JWT_SECRET', { infer: true }),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('RT_JWT_SECRET', { infer: true }),
        expiresIn: '7d',
      }),
    ]);

    return { access_token, refresh_token };
  }

  private async updateRefreshToken(userId: string, refresh_token: string) {
    const hashedRefreshToken = await bcrypt.hash(refresh_token, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedRefreshToken },
    });
  }
}
