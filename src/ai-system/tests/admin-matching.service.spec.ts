import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { AdminMatchingService } from "../services/admin-matching.service"
import { ManualMatch } from "../entities/manual-match.entity"
import { MatchingResultEntity } from "../entities/matching-result.entity"
import { MatchingProfile } from "../entities/matching-profile.entity"
import { CustomLogger } from "../../logging-monitoring/services/custom-logger.service"
import { NotFoundException, BadRequestException } from "@nestjs/common"
import { jest } from "@jest/globals"

describe("AdminMatchingService", () => {
  let service: AdminMatchingService
  let manualMatchRepository: Repository<ManualMatch>
  let matchingResultRepository: Repository<MatchingResultEntity>
  let matchingProfileRepository: Repository<MatchingProfile>
  let customLogger: CustomLogger

  const mockManualMatchRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
  }

  const mockMatchingResultRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  }

  const mockMatchingProfileRepository = {
    findOne: jest.fn(),
  }

  const mockCustomLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminMatchingService,
        {
          provide: getRepositoryToken(ManualMatch),
          useValue: mockManualMatchRepository,
        },
        {
          provide: getRepositoryToken(MatchingResultEntity),
          useValue: mockMatchingResultRepository,
        },
        {
          provide: getRepositoryToken(MatchingProfile),
          useValue: mockMatchingProfileRepository,
        },
        {
          provide: CustomLogger,
          useValue: mockCustomLogger,
        },
      ],
    }).compile()

    service = module.get<AdminMatchingService>(AdminMatchingService)
    manualMatchRepository = module.get<Repository<ManualMatch>>(getRepositoryToken(ManualMatch))
    matchingResultRepository = module.get<Repository<MatchingResultEntity>>(getRepositoryToken(MatchingResultEntity))
    matchingProfileRepository = module.get<Repository<MatchingProfile>>(getRepositoryToken(MatchingProfile))
    customLogger = module.get<CustomLogger>(CustomLogger)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("createManualMatch", () => {
    const mockProfile = { userId: "user1", id: "profile1" }
    const mockManualMatch = {
      id: "manual1",
      sourceUserId: "user1",
      targetUserId: "user2",
      overrideScore: 0.9,
      overrideConfidence: 0.95,
      reason: "Exceptional case",
      adminUserId: "admin1",
      isActive: true,
    }

    beforeEach(() => {
      mockMatchingProfileRepository.findOne.mockResolvedValue(mockProfile)
      mockManualMatchRepository.create.mockReturnValue(mockManualMatch)
      mockManualMatchRepository.save.mockResolvedValue(mockManualMatch)
    })

    it("should create a manual match successfully", async () => {
      const result = await service.createManualMatch("user1", "user2", 0.9, 0.95, "Exceptional case", "admin1")

      expect(mockMatchingProfileRepository.findOne).toHaveBeenCalledTimes(2)
      expect(mockManualMatchRepository.create).toHaveBeenCalledWith({
        sourceUserId: "user1",
        targetUserId: "user2",
        overrideScore: 0.9,
        overrideConfidence: 0.95,
        reason: "Exceptional case",
        adminUserId: "admin1",
        isActive: true,
      })
      expect(mockManualMatchRepository.save).toHaveBeenCalledWith(mockManualMatch)
      expect(customLogger.log).toHaveBeenCalled()
      expect(result).toEqual(mockManualMatch)
    })

    it("should throw BadRequestException if required fields are missing", async () => {
      await expect(service.createManualMatch("user1", "user2", 0.9, 0.95, "Reason", "")).rejects.toThrow(
        BadRequestException,
      )
    })

    it("should throw BadRequestException if score/confidence are out of range", async () => {
      await expect(service.createManualMatch("user1", "user2", 1.1, 0.95, "Reason", "admin1")).rejects.toThrow(
        BadRequestException,
      )
    })

    it("should throw NotFoundException if source profile not found", async () => {
      mockMatchingProfileRepository.findOne.mockResolvedValueOnce(null) // Source user not found
      await expect(service.createManualMatch("user1", "user2", 0.9, 0.95, "Reason", "admin1")).rejects.toThrow(
        NotFoundException,
      )
    })

    it("should throw NotFoundException if target profile not found", async () => {
      mockMatchingProfileRepository.findOne.mockResolvedValueOnce(mockProfile)
      mockMatchingProfileRepository.findOne.mockResolvedValueOnce(null) // Target user not found
      await expect(service.createManualMatch("user1", "user2", 0.9, 0.95, "Reason", "admin1")).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  describe("updateManualMatch", () => {
    const existingManualMatch = {
      id: "manual1",
      sourceUserId: "user1",
      targetUserId: "user2",
      overrideScore: 0.9,
      overrideConfidence: 0.95,
      reason: "Exceptional case",
      adminUserId: "admin1",
      isActive: true,
    }

    beforeEach(() => {
      mockManualMatchRepository.findOne.mockResolvedValue(existingManualMatch)
      mockManualMatchRepository.save.mockImplementation((match) => Promise.resolve(match))
    })

    it("should update a manual match successfully", async () => {
      const updates = { overrideScore: 0.8, reason: "Updated reason" }
      const result = await service.updateManualMatch("manual1", updates, "admin1")

      expect(mockManualMatchRepository.findOne).toHaveBeenCalledWith({ where: { id: "manual1" } })
      expect(mockManualMatchRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ ...existingManualMatch, ...updates }),
      )
      expect(customLogger.log).toHaveBeenCalled()
      expect(result.overrideScore).toBe(0.8)
      expect(result.reason).toBe("Updated reason")
    })

    it("should throw NotFoundException if manual match not found", async () => {
      mockManualMatchRepository.findOne.mockResolvedValue(null)
      await expect(service.updateManualMatch("nonexistent", {}, "admin1")).rejects.toThrow(NotFoundException)
    })

    it("should throw BadRequestException if trying to change immutable fields", async () => {
      await expect(service.updateManualMatch("manual1", { sourceUserId: "newuser" }, "admin1")).rejects.toThrow(
        BadRequestException,
      )
    })

    it("should throw BadRequestException if score/confidence are out of range", async () => {
      await expect(service.updateManualMatch("manual1", { overrideScore: 1.1 }, "admin1")).rejects.toThrow(
        BadRequestException,
      )
    })
  })

  describe("deleteManualMatch", () => {
    it("should delete a manual match successfully", async () => {
      mockManualMatchRepository.delete.mockResolvedValue({ affected: 1 })

      await service.deleteManualMatch("manual1", "admin1")

      expect(mockManualMatchRepository.delete).toHaveBeenCalledWith("manual1")
      expect(customLogger.log).toHaveBeenCalled()
    })

    it("should throw NotFoundException if manual match not found", async () => {
      mockManualMatchRepository.delete.mockResolvedValue({ affected: 0 })
      await expect(service.deleteManualMatch("nonexistent", "admin1")).rejects.toThrow(NotFoundException)
    })
  })

  describe("getAllManualMatches", () => {
    it("should return all manual matches", async () => {
      const matches = [{ id: "manual1" }, { id: "manual2" }]
      mockManualMatchRepository.find.mockResolvedValue(matches)

      const result = await service.getAllManualMatches()

      expect(mockManualMatchRepository.find).toHaveBeenCalledWith({ order: { createdAt: "DESC" } })
      expect(result).toEqual(matches)
    })
  })

  describe("getManualMatchById", () => {
    const mockManualMatch = { id: "manual1", sourceUserId: "user1" }

    it("should return a manual match by ID", async () => {
      mockManualMatchRepository.findOne.mockResolvedValue(mockManualMatch)
      const result = await service.getManualMatchById("manual1")
      expect(mockManualMatchRepository.findOne).toHaveBeenCalledWith({ where: { id: "manual1" } })
      expect(result).toEqual(mockManualMatch)
    })

    it("should throw NotFoundException if manual match not found", async () => {
      mockManualMatchRepository.findOne.mockResolvedValue(null)
      await expect(service.getManualMatchById("nonexistent")).rejects.toThrow(NotFoundException)
    })
  })

  describe("overrideAiMatch", () => {
    const originalAiMatch = {
      id: "aiMatch1",
      sourceUserId: "userA",
      targetUserId: "userB",
      score: 0.7,
      confidence: 0.8,
      isOverridden: false,
    }
    const createdManualMatch = {
      id: "manualOverride1",
      sourceUserId: "userA",
      targetUserId: "userB",
      overrideScore: 0.99,
      overrideConfidence: 0.99,
      reason: "Admin override",
      adminUserId: "admin1",
      originalMatchId: "aiMatch1",
    }

    beforeEach(() => {
      mockMatchingResultRepository.findOne.mockResolvedValue(originalAiMatch)
      mockManualMatchRepository.create.mockReturnValue(createdManualMatch)
      mockManualMatchRepository.save.mockResolvedValue(createdManualMatch)
      mockMatchingResultRepository.save.mockImplementation((match) => Promise.resolve(match))
    })

    it("should override an AI match and create a manual match entry", async () => {
      const result = await service.overrideAiMatch("aiMatch1", 0.99, 0.99, "Admin override", "admin1")

      expect(mockMatchingResultRepository.findOne).toHaveBeenCalledWith({ where: { id: "aiMatch1" } })
      expect(mockManualMatchRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceUserId: "userA",
          targetUserId: "userB",
          overrideScore: 0.99,
          overrideConfidence: 0.99,
          reason: "Admin override",
          adminUserId: "admin1",
          originalMatchId: "aiMatch1",
        }),
      )
      expect(mockManualMatchRepository.save).toHaveBeenCalledWith(createdManualMatch)
      expect(mockMatchingResultRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "aiMatch1",
          isOverridden: true,
          overriddenByManualMatchId: "manualOverride1",
        }),
      )
      expect(customLogger.log).toHaveBeenCalled()
      expect(result).toEqual(createdManualMatch)
    })

    it("should throw NotFoundException if original AI match not found", async () => {
      mockMatchingResultRepository.findOne.mockResolvedValue(null)
      await expect(service.overrideAiMatch("nonexistent", 0.9, 0.9, "Reason", "admin1")).rejects.toThrow(
        NotFoundException,
      )
    })

    it("should throw BadRequestException if AI match is already overridden", async () => {
      mockMatchingResultRepository.findOne.mockResolvedValue({ ...originalAiMatch, isOverridden: true })
      await expect(service.overrideAiMatch("aiMatch1", 0.9, 0.9, "Reason", "admin1")).rejects.toThrow(
        BadRequestException,
      )
    })
  })
})
