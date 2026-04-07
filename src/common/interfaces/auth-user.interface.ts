import type { Role } from '../../generated/prisma/enums';

export interface AuthUser {
  sub: string;
  email: string;
  role: Role;
  name: string;
}
