import { Injectable, ConsoleLogger, Scope } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { Log } from "../entities/log.entity"
import { LogLevel, LogCategory } from "../interfaces/log.interface"

@Injectable({ scope: Scope.TRANSIENT })
export class CustomLogger extends ConsoleLogger {
  private logRepository: Repository<Log>

  constructor(logRepository: Repository<Log>) {
    super()
    this.logRepository = logRepository
  }

  private async saveLog(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, any>,
    userId?: string,
    correlationId?: string,
  ): Promise<void> {
    try {
      const logEntry = this.logRepository.create({
        level,
        category: metadata?.category || LogCategory.SYSTEM,
        message,
        context: context || this.context,
        metadata: metadata || {},
        userId,
        correlationId,
      })
      await this.logRepository.save(logEntry)
    } catch (dbError) {
      // Fallback to console if database logging fails
      console.error(`Failed to save log to DB: ${dbError.message}`, dbError.stack)
      super.error(`Failed to save log to DB: ${dbError.message}`, dbError.stack, context)
    }
  }

  log(message: any, context?: string, metadata?: Record<string, any>): void {
    super.log(message, context)
    this.saveLog(LogLevel.INFO, message, context, metadata)
  }

  error(message: any, trace?: string, context?: string, metadata?: Record<string, any>): void {
    super.error(message, trace, context)
    this.saveLog(LogLevel.ERROR, message, context, { ...metadata, trace })
  }

  warn(message: any, context?: string, metadata?: Record<string, any>): void {
    super.warn(message, context)
    this.saveLog(LogLevel.WARN, message, context, metadata)
  }

  debug(message: any, context?: string, metadata?: Record<string, any>): void {
    super.debug(message, context)
    this.saveLog(LogLevel.DEBUG, message, context, metadata)
  }

  verbose(message: any, context?: string, metadata?: Record<string, any>): void {
    super.verbose(message, context)
    this.saveLog(LogLevel.VERBOSE, message, context, metadata)
  }

  // Specific logging methods for different categories
  logRecommendation(userId: string, message: string, metadata?: Record<string, any>, correlationId?: string): void {
    this.log(message, undefined, { ...metadata, category: LogCategory.RECOMMENDATION, userId, correlationId })
  }

  logUsage(userId: string, message: string, metadata?: Record<string, any>, correlationId?: string): void {
    this.log(message, undefined, { ...metadata, category: LogCategory.USAGE, userId, correlationId })
  }

  logPerformance(message: string, metadata?: Record<string, any>, correlationId?: string): void {
    this.log(message, undefined, { ...metadata, category: LogCategory.PERFORMANCE, correlationId })
  }
}
