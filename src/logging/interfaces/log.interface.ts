export enum LogLevel {
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  DEBUG = "debug",
  VERBOSE = "verbose",
}

export enum LogCategory {
  SYSTEM = "system",
  MATCHING = "matching",
  PROFILE = "profile",
  USAGE = "usage",
  RECOMMENDATION = "recommendation",
  ERROR = "error",
  PERFORMANCE = "performance",
}

export interface LogEntry {
  level: LogLevel
  category: LogCategory
  message: string
  context?: string
  timestamp?: Date
  metadata?: Record<string, any>
  userId?: string
  correlationId?: string
}

export interface LogStats {
  totalLogs: number
  logsByLevel: Record<LogLevel, number>
  logsByCategory: Record<LogCategory, number>
  recentErrors: LogEntry[]
  recentRecommendations: LogEntry[]
}
