import type { UserRole } from "../../user/enums/user-role.enum"

export interface JwtPayload {
  sub: string
  email: string
  role: UserRole
  iat?: number
  exp?: number
}
