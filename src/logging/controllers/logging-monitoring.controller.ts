import { Controller, Get, HttpStatus, HttpException } from "@nestjs/common"
import type { LoggingMonitoringService } from "../services/logging-monitoring.service"
import type { LogLevel, LogCategory, LogStats, LogEntry } from "../interfaces/log.interface"

@Controller("monitor")
export class LoggingMonitoringController {
  constructor(private readonly loggingMonitoringService: LoggingMonitoringService) {}

  @Get("health")
  async getHealth(): Promise<{ status: string; database: string; timestamp: Date }> {
    return this.loggingMonitoringService.getHealthStatus()
  }

  @Get("logs")
  async getLogs(
    level?: LogLevel,
    category?: LogCategory,
    userId?: string,
    startDate?: string,
    endDate?: string,
    limit?: number,
    offset?: number,
  ): Promise<LogEntry[]> {
    try {
      const parsedStartDate = startDate ? new Date(startDate) : undefined
      const parsedEndDate = endDate ? new Date(endDate) : undefined

      const logs = await this.loggingMonitoringService.getLogs(
        level,
        category,
        userId,
        parsedStartDate,
        parsedEndDate,
        limit,
        offset,
      )
      return logs.map((log) => ({
        level: log.level,
        category: log.category,
        message: log.message,
        context: log.context,
        timestamp: log.createdAt,
        metadata: log.metadata,
        userId: log.userId,
        correlationId: log.correlationId,
      }))
    } catch (error) {
      throw new HttpException(`Failed to retrieve logs: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Get("stats")
  async getStats(): Promise<LogStats> {
    try {
      return await this.loggingMonitoringService.getLogStatistics()
    } catch (error) {
      throw new HttpException(`Failed to retrieve statistics: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}
