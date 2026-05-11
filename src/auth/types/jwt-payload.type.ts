import { Role } from 'generated/prisma/enums';

export interface JwtPayload {
  sub: string;
  role: Role;
}

export interface JwtPayloadWithAccess extends JwtPayload {
  accessToken: string;
}

export interface JwtPayloadWithRefresh extends JwtPayload {
  refreshToken: string;
}
