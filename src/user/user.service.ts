import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from 'generated/prisma/client';
import { Role, UserStatus } from 'generated/prisma/enums';
import { PrismaService } from 'src/db/prisma.service';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';

@Injectable()
export class UserService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}
  async create(
    createUserInput: CreateUserInput,
    role: Role,
    adminUserId?: string,
  ) {
    const passwordHash = await this.createHash(createUserInput.password);
    const user = await this.prismaService.user.create({
      data: {
        ...createUserInput,
        password: passwordHash,
        status: UserStatus.ACTIVE,
        role: role,
      },
    });

    await this.auditLog.log({
      userId: adminUserId,
      action: 'CREATE',
      entity: 'user',
      entityId: user.id,
      details: { role, email: user.email },
    });

    return user;
  }

  async findAll(
    page: number,
    pageSize: number,
    sort: string = 'createdAt-desc',
    search: string | undefined,
  ) {
    const regex = /^[a-zA-Z]+-(ASC|DESC|asc|desc)$/;
    if (sort && !regex.test(sort)) {
      if (!regex.test(sort)) {
        throw new BadRequestException(
          'Sort must be in the format [field]-[ASC|DESC]',
        );
      }
    }
    const [field, order] = sort.split('-');

    const orderBy: Prisma.UserOrderByWithRelationInput = {
      [field]: order.toLowerCase() as 'asc' | 'desc',
    };

    const users = await this.prismaService.user.findMany({
      where: {
        role: {
          notIn: [Role.SUPERADMIN, Role.MEMBER],
        },
        OR: search
          ? [
              { name: { contains: search, mode: 'insensitive' } },
              { paternalSurname: { contains: search, mode: 'insensitive' } },
              { maternalSurname: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      orderBy,
      take: pageSize,
      skip: (page - 1) * pageSize,
    });

    const count = await this.prismaService.user.count({
      where: {
        role: {
          notIn: [Role.SUPERADMIN, Role.MEMBER],
        },
        OR: search
          ? [
              { name: { contains: search, mode: 'insensitive' } },
              { paternalSurname: { contains: search, mode: 'insensitive' } },
              { maternalSurname: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
    });

    return {
      users,
      meta: {
        total: count,
        page,
        totalPages: Math.ceil(count / pageSize),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async update(
    id: string,
    updateUserInput: UpdateUserInput,
    role: Role,
    adminUserId?: string,
  ) {
    const userFound = await this.findById(id);
    if (!userFound) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const emailFound = await this.findByEmail(updateUserInput.email);
    if (emailFound && emailFound.id !== id) {
      throw new BadRequestException(
        'Correo electrónico ya está en uso por otro usuario',
      );
    }
    if (updateUserInput.password) {
      updateUserInput.password = await this.createHash(
        updateUserInput.password,
      );
    }
    const { id: userId, ...data } = updateUserInput;

    const updatedUser = await this.prismaService.user.update({
      where: {
        id: userId,
      },
      data: { ...data, role },
    });

    await this.auditLog.log({
      userId: adminUserId,
      action: 'UPDATE',
      entity: 'user',
      entityId: id,
      details: { updatedFields: Object.keys(data) },
    });

    return updatedUser;
  }

  async remove(ids: string[], adminUserId?: string) {
    const usersFound = await this.findByIds(ids);
    if (!usersFound) {
      throw new NotFoundException('Usuarios no encontrados');
    }
    await this.prismaService.user.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    await this.auditLog.logMany(
      ids.map((id) => ({
        userId: adminUserId,
        action: 'DELETE',
        entity: 'user',
        entityId: id,
      })),
    );

    return true;
  }

  async changeUserStatus(
    ids: string[],
    status: UserStatus,
    adminUserId?: string,
  ) {
    const usersFound = await this.findByIds(ids);
    if (!usersFound) {
      throw new NotFoundException('Usuarios no encontrados');
    }
    await this.prismaService.user.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: {
        status,
      },
    });

    await this.auditLog.logMany(
      ids.map((id) => ({
        userId: adminUserId,
        action: 'UPDATE',
        entity: 'user',
        entityId: id,
        details: { field: 'status', to: status },
      })),
    );

    return true;
  }

  async findByEmail(email: string | undefined) {
    return await this.prismaService.user.findUnique({
      where: {
        email,
      },
    });
  }
  async findById(id: string) {
    return await this.prismaService.user.findUnique({
      where: {
        id,
        role: {
          notIn: [Role.SUPERADMIN, Role.MEMBER],
        },
      },
    });
  }
  async countUser() {
    return await this.prismaService.user.count();
  }

  async updatePassword(id: string, password: string) {
    const hashedPassword = await this.createHash(password);
    await this.prismaService.user.update({
      where: {
        id,
      },
      data: {
        password: hashedPassword,
      },
    });

    return {
      message: 'Password updated successfully',
    };
  }

  async createHash(value: string) {
    return bcrypt.hash(value, 10);
  }

  async verifyPassword(password: string, hash: string) {
    return await bcrypt.compare(password, hash);
  }

  async findByIds(ids: string[]) {
    return await this.prismaService.user.findMany({
      where: {
        id: {
          in: ids,
        },
        role: {
          notIn: [Role.SUPERADMIN, Role.MEMBER],
        },
      },
    });
  }
}
