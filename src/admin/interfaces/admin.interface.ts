import type { LogLevel, LogCategory } from "../../logging-monitoring/interfaces/log.interface"

export interface UserProfileSummary {
  userId: string
  isActive: boolean
  attributes: Record<string, any>
  preferences: Record<string, any>
  createdAt: Date
  updatedAt: Date
  matchCount: number
  averageScore: number
}

export interface AdminDashboardSummary {
  totalUsers: number
  activeUsers: number
  totalAiMatches: number
  totalManualMatches: number
  recentErrors: { message: string; timestamp: Date; level: LogLevel }[]
  recentRecommendations: { message: string; timestamp: Date; userId?: string }[]
  systemHealth: { status: string; database: string }
}

export interface UpdateUserProfileDto {
  isActive?: boolean
  attributes?: Record<string, any>
  preferences?: Record<string, any>
  weights?: Record<string, number>
  filters?: Record<string, any>
  metadata?: Record<string, any>
}

export interface AdminLogFilterDto {
  level?: LogLevel
  category?: LogCategory
  userId?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}
