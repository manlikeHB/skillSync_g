import type { User } from "../../users/entities/user.entity"

export interface AuthResponse {
  access_token: string
  user: Omit<User, "password">
}
