import type { User } from "../../user/entities/user.entity"

export interface AuthResponse {
  access_token: string
  user: Omit<User, "password">
}
