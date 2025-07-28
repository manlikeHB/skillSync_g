import { Injectable, Logger } from "@nestjs/common"
import { type Repository, Between } from "typeorm"
import type { Log } from "../entities/log.entity"
import { LogLevel, LogCategory, type LogStats } from "../interfaces/log.interface"
import type { CustomLogger } from "./custom-logger.service"

@Injectable()
export class LoggingMonitoringService {
  private readonly logger = new Logger(LoggingMonitoringService.name)

  constructor(
    private logRepository: Repository<Log>, // Removed the decorator here
    private customLogger: CustomLogger, // Inject the custom logger
  ) {}

  /**
   * Logs a message with a specific level and category.
   * @param level The log level (e.g., INFO, ERROR).
   * @param category The log category (e.g., MATCHING, USAGE).
   * @param message The log message.
   * @param context The context of the log (e.g., class name, function name).
   * @param metadata Additional data to store with the log.
   * @param userId Optional user ID associated with the log.
   * @param correlationId Optional correlation ID for tracing requests.
   */
  async recordLog(
    level: LogLevel,
    category: LogCategory,
    message: string,
    context?: string,
    metadata?: Record<string, any>,
    userId?: string,
    correlationId?: string,
  ): Promise<Log> {
    const logEntry = this.logRepository.create({
      level,
      category,
      message,
      context,
      metadata,
      userId,
      correlationId,
    })
    return await this.logRepository.save(logEntry)
  }

  /**
   * Retrieves logs based on filters.
   * @param level Optional log level to filter by.
   * @param category Optional log category to filter by.
   * @param userId Optional user ID to filter by.
   * @param startDate Optional start date for logs.
   * @param endDate Optional end date for logs.
   * @param limit Maximum number of logs to return.
   * @param offset Offset for pagination.
   */
  async getLogs(
    level?: LogLevel,
    category?: LogCategory,
    userId?: string,
    startDate?: Date,
    endDate?: Date,
    limit = 100,
    offset = 0,
  ): Promise<Log[]> {
    const where: any = {}
    if (level) where.level = level
    if (category) where.category = category
    if (userId) where.userId = userId
    if (startDate && endDate) where.createdAt = Between(startDate, endDate)
    else if (startDate) where.createdAt = Between(startDate, new Date())

    return await this.logRepository.find({
      where,
      order: { createdAt: "DESC" },
      take: limit,
      skip: offset,
    })
  }

  /**
   * Provides aggregated statistics about logs.
   */
  async getLogStatistics(): Promise<LogStats> {
    const totalLogs = await this.logRepository.count()

    const logsByLevel = await this.logRepository
      .createQueryBuilder("log")
      .select("log.level", "level")
      .addSelect("COUNT(*)", "count")
      .groupBy("log.level")
      .getRawMany()

    const logsByCategory = await this.logRepository
      .createQueryBuilder("log")
      .select("log.category", "category")
      .addSelect("COUNT(*)", "count")
      .groupBy("log.category")
      .getRawMany()

    const recentErrors = await this.logRepository.find({
      where: { level: LogLevel.ERROR },
      order: { createdAt: "DESC" },
      take: 10,
    })

    const recentRecommendations = await this.logRepository.find({
      where: { category: LogCategory.RECOMMENDATION },
      order: { createdAt: "DESC" },
      take: 10,
    })

    const stats: LogStats = {
      totalLogs,
      logsByLevel: logsByLevel.reduce((acc, { level, count }) => ({ ...acc, [level]: Number.parseInt(count, 10) }), {}),
      logsByCategory: logsByCategory.reduce(
        (acc, { category, count }) => ({ ...acc, [category]: Number.parseInt(count, 10) }),
        {},
      ),
      recentErrors: recentErrors.map((log) => ({
        level: log.level,
        category: log.category,
        message: log.message,
        context: log.context,
        timestamp: log.createdAt,
        metadata: log.metadata,
        userId: log.userId,
        correlationId: log.correlationId,
      })),
      recentRecommendations: recentRecommendations.map((log) => ({
        level: log.level,
        category: log.category,
        message: log.message,
        context: log.context,
        timestamp: log.createdAt,
        metadata: log.metadata,
        userId: log.userId,
        correlationId: log.correlationId,
      })),
    }

    return stats
  }

  /**
   * Health check method.
   */
  async getHealthStatus(): Promise<{ status: string; database: string; timestamp: Date }> {
    try {
      await this.logRepository.query("SELECT 1") // Simple query to check DB connection
      return { status: "ok", database: "connected", timestamp: new Date() }
    } catch (error) {
      this.logger.error(`Database health check failed: ${error.message}`, error.stack)
      return { status: "degraded", database: "disconnected", timestamp: new Date() }
    }
  }
}
