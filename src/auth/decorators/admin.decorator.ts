import { applyDecorators, UseGuards } from '@nestjs/common';
import { Role } from 'generated/prisma/enums';
import { Roles } from './roles.decorator.js';
import { GqlAccessTokenGuard } from '../guards/gql-access-token.guard';
import { RolesGuard } from '../guards/roles.guard';

const ALL_STAFF: Role[] = [
  Role.SUPERADMIN,
  Role.ADMIN,
  Role.TREASURER,
  Role.EVENT_MANAGER,
  Role.CONTENT_EDITOR,
  Role.SUPPORT_AGENT,
  Role.SECRETARY,
  Role.MODERATOR,
];

/** Cualquier rol de staff (todos excepto MEMBER). */
export const AdminOnly = () =>
  applyDecorators(
    UseGuards(GqlAccessTokenGuard, RolesGuard),
    Roles(...ALL_STAFF),
  );

/** Solo SUPERADMIN y ADMIN (gestión completa). */
export const SuperAdminOnly = () =>
  applyDecorators(
    UseGuards(GqlAccessTokenGuard, RolesGuard),
    Roles(Role.SUPERADMIN, Role.ADMIN),
  );

/** Cuotas, facturación y descuentos. */
export const FinanceOnly = () =>
  applyDecorators(
    UseGuards(GqlAccessTokenGuard, RolesGuard),
    Roles(Role.SUPERADMIN, Role.ADMIN, Role.TREASURER),
  );

/** Actividades, asistentes y certificados. */
export const EventsOnly = () =>
  applyDecorators(
    UseGuards(GqlAccessTokenGuard, RolesGuard),
    Roles(Role.SUPERADMIN, Role.ADMIN, Role.EVENT_MANAGER),
  );

/** Posts, convenios y encuestas. */
export const ContentOnly = () =>
  applyDecorators(
    UseGuards(GqlAccessTokenGuard, RolesGuard),
    Roles(Role.SUPERADMIN, Role.ADMIN, Role.CONTENT_EDITOR, Role.MODERATOR),
  );

/** Soporte / tickets. */
export const SupportOnly = () =>
  applyDecorators(
    UseGuards(GqlAccessTokenGuard, RolesGuard),
    Roles(Role.SUPERADMIN, Role.ADMIN, Role.SUPPORT_AGENT, Role.MODERATOR),
  );

/** Gestión de miembros y sanciones. */
export const MembersManagementOnly = () =>
  applyDecorators(
    UseGuards(GqlAccessTokenGuard, RolesGuard),
    Roles(Role.SUPERADMIN, Role.ADMIN, Role.SECRETARY),
  );
