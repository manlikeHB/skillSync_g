import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { LoggingMonitoringService } from "../services/logging-monitoring.service"
import { CustomLogger } from "../services/custom-logger.service"
import { Log } from "../entities/log.entity"
import { LogLevel, LogCategory } from "../interfaces/log.interface"
import { jest } from "@jest/globals"

describe("LoggingMonitoringService", () => {
  let service: LoggingMonitoringService
  let logRepository: Repository<Log>
  let customLogger: CustomLogger

  const mockLogRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    query: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    })),
  }

  const mockCustomLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    logRecommendation: jest.fn(),
    logUsage: jest.fn(),
    logPerformance: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggingMonitoringService,
        {
          provide: getRepositoryToken(Log),
          useValue: mockLogRepository,
        },
        {
          provide: CustomLogger,
          useValue: mockCustomLogger,
        },
      ],
    }).compile()

    service = module.get<LoggingMonitoringService>(LoggingMonitoringService)
    logRepository = module.get<Repository<Log>>(getRepositoryToken(Log))
    customLogger = module.get<CustomLogger>(CustomLogger)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("recordLog", () => {
    it("should create and save a log entry", async () => {
      const logData = {
        level: LogLevel.INFO,
        category: LogCategory.SYSTEM,
        message: "Test message",
        context: "TestContext",
        metadata: { key: "value" },
        userId: "user123",
        correlationId: "corr456",
      }
      const createdLog = { id: "log1", ...logData, createdAt: new Date() }

      mockLogRepository.create.mockReturnValue(createdLog)
      mockLogRepository.save.mockResolvedValue(createdLog)

      const result = await service.recordLog(
        logData.level,
        logData.category,
        logData.message,
        logData.context,
        logData.metadata,
        logData.userId,
        logData.correlationId,
      )

      expect(mockLogRepository.create).toHaveBeenCalledWith(logData)
      expect(mockLogRepository.save).toHaveBeenCalledWith(createdLog)
      expect(result).toBe(createdLog)
    })
  })

  describe("getLogs", () => {
    it("should retrieve logs with default parameters", async () => {
      const logs = [{ id: "log1", message: "test" }]
      mockLogRepository.find.mockResolvedValue(logs)

      const result = await service.getLogs()

      expect(mockLogRepository.find).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: "DESC" },
        take: 100,
        skip: 0,
      })
      expect(result).toBe(logs)
    })

    it("should retrieve logs with filters", async () => {
      const logs = [{ id: "log2", message: "error" }]
      mockLogRepository.find.mockResolvedValue(logs)

      const level = LogLevel.ERROR
      const category = LogCategory.ERROR
      const userId = "user123"
      const limit = 10
      const offset = 5

      const result = await service.getLogs(level, category, userId, undefined, undefined, limit, offset)

      expect(mockLogRepository.find).toHaveBeenCalledWith({
        where: { level, category, userId },
        order: { createdAt: "DESC" },
        take: limit,
        skip: offset,
      })
      expect(result).toBe(logs)
    })
  })

  describe("getLogStatistics", () => {
    it("should return correct log statistics", async () => {
      mockLogRepository.count.mockResolvedValue(100)
      mockLogRepository.createQueryBuilder().getRawMany.mockResolvedValueOnce([
        { level: LogLevel.INFO, count: "50" },
        { level: LogLevel.ERROR, count: "10" },
      ])
      mockLogRepository.createQueryBuilder().getRawMany.mockResolvedValueOnce([
        { category: LogCategory.SYSTEM, count: "60" },
        { category: LogCategory.MATCHING, count: "40" },
      ])
      mockLogRepository.find.mockResolvedValueOnce([
        { level: LogLevel.ERROR, message: "Error 1", createdAt: new Date() },
      ])
      mockLogRepository.find.mockResolvedValueOnce([
        { category: LogCategory.RECOMMENDATION, message: "Rec 1", createdAt: new Date() },
      ])

      const stats = await service.getLogStatistics()

      expect(stats.totalLogs).toBe(100)
      expect(stats.logsByLevel[LogLevel.INFO]).toBe(50)
      expect(stats.logsByLevel[LogLevel.ERROR]).toBe(10)
      expect(stats.logsByCategory[LogCategory.SYSTEM]).toBe(60)
      expect(stats.logsByCategory[LogCategory.MATCHING]).toBe(40)
      expect(stats.recentErrors).toHaveLength(1)
      expect(stats.recentRecommendations).toHaveLength(1)
    })
  })

  describe("getHealthStatus", () => {
    it("should return 'ok' status if database is connected", async () => {
      mockLogRepository.query.mockResolvedValue([])

      const status = await service.getHealthStatus()

      expect(status.status).toBe("ok")
      expect(status.database).toBe("connected")
      expect(status.timestamp).toBeInstanceOf(Date)
    })

    it("should return 'degraded' status if database connection fails", async () => {
      mockLogRepository.query.mockRejectedValue(new Error("DB connection failed"))

      const status = await service.getHealthStatus()

      expect(status.status).toBe("degraded")
      expect(status.database).toBe("disconnected")
      expect(status.timestamp).toBeInstanceOf(Date)
      expect(customLogger.error).toHaveBeenCalled() // Ensure error is logged
    })
  })
})
