import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { AdminService } from "../services/admin.service"
import { MatchingProfile } from "../../matching/entities/matching-profile.entity"
import { MatchingResultEntity } from "../../matching/entities/matching-result.entity"
import { ManualMatch } from "../../matching/entities/manual-match.entity"
import { Log } from "../../logging-monitoring/entities/log.entity"
import { MatchingEngineService } from "../../matching/services/matching-engine.service"
import { AdminMatchingService } from "../../matching/services/admin-matching.service"
import { LoggingMonitoringService } from "../../logging-monitoring/services/logging-monitoring.service"
import { CustomLogger } from "../../logging-monitoring/services/custom-logger.service"
import { NotFoundException } from "@nestjs/common"
import { LogLevel } from "../../logging-monitoring/interfaces/log.interface"
import { jest } from "@jest/globals"

describe("AdminService", () => {
  let service: AdminService
  let matchingProfileRepository: Repository<MatchingProfile>
  let matchingResultRepository: Repository<MatchingResultEntity>
  let manualMatchRepository: Repository<ManualMatch>
  let logRepository: Repository<Log>
  let matchingEngineService: MatchingEngineService
  let adminMatchingService: AdminMatchingService
  let loggingMonitoringService: LoggingMonitoringService
  let customLogger: CustomLogger

  const mockMatchingProfileRepository = {
    count: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  }
  const mockMatchingResultRepository = {
    count: jest.fn(),
    find: jest.fn(),
  }
  const mockManualMatchRepository = {
    count: jest.fn(),
    find: jest.fn(),
  }
  const mockLogRepository = {
    find: jest.fn(),
  }
  const mockMatchingEngineService = {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
  }
  const mockAdminMatchingService = {
    getAllManualMatches: jest.fn(),
  }
  const mockLoggingMonitoringService = {
    getLogStatistics: jest.fn(),
    getHealthStatus: jest.fn(),
    getLogs: jest.fn(),
  }
  const mockCustomLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(MatchingProfile), useValue: mockMatchingProfileRepository },
        { provide: getRepositoryToken(MatchingResultEntity), useValue: mockMatchingResultRepository },
        { provide: getRepositoryToken(ManualMatch), useValue: mockManualMatchRepository },
        { provide: getRepositoryToken(Log), useValue: mockLogRepository },
        { provide: MatchingEngineService, useValue: mockMatchingEngineService },
        { provide: AdminMatchingService, useValue: mockAdminMatchingService },
        { provide: LoggingMonitoringService, useValue: mockLoggingMonitoringService },
        { provide: CustomLogger, useValue: mockCustomLogger },
      ],
    }).compile()

    service = module.get<AdminService>(AdminService)
    matchingProfileRepository = module.get<Repository<MatchingProfile>>(getRepositoryToken(MatchingProfile))
    matchingResultRepository = module.get<Repository<MatchingResultEntity>>(getRepositoryToken(MatchingResultEntity))
    manualMatchRepository = module.get<Repository<ManualMatch>>(getRepositoryToken(ManualMatch))
    logRepository = module.get<Repository<Log>>(getRepositoryToken(Log))
    matchingEngineService = module.get<MatchingEngineService>(MatchingEngineService)
    adminMatchingService = module.get<AdminMatchingService>(AdminMatchingService)
    loggingMonitoringService = module.get<LoggingMonitoringService>(LoggingMonitoringService)
    customLogger = module.get<CustomLogger>(CustomLogger)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("getDashboardSummary", () => {
    it("should return a comprehensive dashboard summary", async () => {
      mockMatchingProfileRepository.count.mockResolvedValueOnce(100).mockResolvedValueOnce(80)
      mockMatchingResultRepository.count.mockResolvedValue(500)
      mockManualMatchRepository.count.mockResolvedValue(10)
      mockLoggingMonitoringService.getLogStatistics.mockResolvedValue({
        totalLogs: 1000,
        logsByLevel: { info: 800, error: 200 },
        logsByCategory: { system: 500, matching: 300, error: 200 },
        recentErrors: [{ message: "Error 1", timestamp: new Date(), level: LogLevel.ERROR }],
        recentRecommendations: [{ message: "Rec 1", timestamp: new Date(), userId: "u1" }],
      })
      mockLoggingMonitoringService.getHealthStatus.mockResolvedValue({ status: "ok", database: "connected" })

      const summary = await service.getDashboardSummary()

      expect(summary.totalUsers).toBe(100)
      expect(summary.activeUsers).toBe(80)
      expect(summary.totalAiMatches).toBe(500)
      expect(summary.totalManualMatches).toBe(10)
      expect(summary.recentErrors).toHaveLength(1)
      expect(summary.recentRecommendations).toHaveLength(1)
      expect(summary.systemHealth.status).toBe("ok")
      expect(summary.systemHealth.database).toBe("connected")
    })

    it("should log error if fetching summary fails", async () => {
      mockMatchingProfileRepository.count.mockRejectedValue(new Error("DB error"))
      await expect(service.getDashboardSummary()).rejects.toThrow("DB error")
      expect(customLogger.error).toHaveBeenCalled()
    })
  })

  describe("getAllUserProfilesSummary", () => {
    it("should return a summary of all user profiles", async () => {
      const profiles = [
        {
          userId: "u1",
          isActive: true,
          attributes: {},
          preferences: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          matchCount: 5,
          averageScore: 0.7,
        },
      ]
      mockMatchingProfileRepository.find.mockResolvedValue(profiles)

      const result = await service.getAllUserProfilesSummary()

      expect(matchingProfileRepository.find).toHaveBeenCalledWith({
        select: expect.any(Array),
        order: { createdAt: "DESC" },
      })
      expect(result).toEqual([
        {
          userId: "u1",
          isActive: true,
          attributes: {},
          preferences: {},
          createdAt: profiles[0].createdAt,
          updatedAt: profiles[0].updatedAt,
          matchCount: 5,
          averageScore: 0.7,
        },
      ])
    })
  })

  describe("getUserProfileDetails", () => {
    it("should return detailed user profile", async () => {
      const profile = { userId: "u1", attributes: { age: 30 } }
      mockMatchingProfileRepository.findOne.mockResolvedValue(profile)

      const result = await service.getUserProfileDetails("u1")
      expect(matchingProfileRepository.findOne).toHaveBeenCalledWith({ where: { userId: "u1" } })
      expect(result).toEqual(profile)
    })

    it("should throw NotFoundException if profile not found", async () => {
      mockMatchingProfileRepository.findOne.mockResolvedValue(null)
      await expect(service.getUserProfileDetails("nonexistent")).rejects.toThrow(NotFoundException)
    })
  })

  describe("updateUserProfile", () => {
    const existingProfile = { userId: "u1", isActive: true, attributes: { age: 30 } }
    const updates = { isActive: false, attributes: { age: 31 } }
    const adminId = "admin1"

    beforeEach(() => {
      mockMatchingProfileRepository.findOne.mockResolvedValue(existingProfile)
      mockMatchingProfileRepository.save.mockImplementation((p) => Promise.resolve(p))
    })

    it("should update user profile and log the action", async () => {
      const result = await service.updateUserProfile("u1", updates, adminId)

      expect(matchingProfileRepository.findOne).toHaveBeenCalledWith({ where: { userId: "u1" } })
      expect(matchingProfileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ ...existingProfile, ...updates }),
      )
      expect(customLogger.log).toHaveBeenCalled()
      expect(result.isActive).toBe(false)
      expect(result.attributes.age).toBe(31)
    })

    it("should throw NotFoundException if profile not found", async () => {
      mockMatchingProfileRepository.findOne.mockResolvedValue(null)
      await expect(service.updateUserProfile("nonexistent", updates, adminId)).rejects.toThrow(NotFoundException)
    })
  })

  describe("deactivateUserProfile", () => {
    it("should deactivate user profile", async () => {
      const profile = { userId: "u1", isActive: true }
      mockMatchingProfileRepository.findOne.mockResolvedValue(profile)
      mockMatchingProfileRepository.save.mockImplementation((p) => Promise.resolve(p))

      const result = await service.deactivateUserProfile("u1", "admin1")
      expect(result.isActive).toBe(false)
      expect(customLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("deactivated"),
        expect.any(String),
        expect.objectContaining({ action: "admin_deactivate_profile" }),
      )
    })
  })

  describe("activateUserProfile", () => {
    it("should activate user profile", async () => {
      const profile = { userId: "u1", isActive: false }
      mockMatchingProfileRepository.findOne.mockResolvedValue(profile)
      mockMatchingProfileRepository.save.mockImplementation((p) => Promise.resolve(p))

      const result = await service.activateUserProfile("u1", "admin1")
      expect(result.isActive).toBe(true)
      expect(customLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("activated"),
        expect.any(String),
        expect.objectContaining({ action: "admin_activate_profile" }),
      )
    })
  })

  describe("getAllAiMatches", () => {
    it("should return all AI matches", async () => {
      const aiMatches = [{ id: "ai1", score: 0.8 }]
      mockMatchingResultRepository.find.mockResolvedValue(aiMatches)

      const result = await service.getAllAiMatches()
      expect(matchingResultRepository.find).toHaveBeenCalledWith({ order: { createdAt: "DESC" } })
      expect(result).toEqual(aiMatches)
    })
  })

  describe("getAllManualMatchAdjustments", () => {
    it("should return all manual match adjustments", async () => {
      const manualMatches = [{ id: "manual1", overrideScore: 0.9 }]
      mockAdminMatchingService.getAllManualMatches.mockResolvedValue(manualMatches)

      const result = await service.getAllManualMatchAdjustments()
      expect(adminMatchingService.getAllManualMatches).toHaveBeenCalled()
      expect(result).toEqual(manualMatches)
    })
  })

  describe("getSystemLogs", () => {
    it("should return system logs based on filters", async () => {
      const logs = [{ id: "log1", message: "test" }]
      const filters = { level: LogLevel.INFO, limit: 5 }
      mockLoggingMonitoringService.getLogs.mockResolvedValue(logs)

      const result = await service.getSystemLogs(filters)
      expect(loggingMonitoringService.getLogs).toHaveBeenCalledWith(
        filters.level,
        undefined,
        undefined,
        undefined,
        undefined,
        filters.limit,
        undefined,
      )
      expect(result).toEqual(logs)
    })
  })
})
