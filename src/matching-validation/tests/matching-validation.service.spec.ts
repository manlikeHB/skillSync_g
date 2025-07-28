import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { MatchingValidationService } from "../services/matching-validation.service"
import { MatchingEngineService } from "../../matching/services/matching-engine.service"
import { CustomLogger } from "../../logging-monitoring/services/custom-logger.service"
import { MatchingProfile } from "../../matching/entities/matching-profile.entity"
import { LogCategory } from "../../logging-monitoring/interfaces/log.interface"
import { BadRequestException } from "@nestjs/common"
import { jest } from "@jest/globals"

describe("MatchingValidationService", () => {
  let service: MatchingValidationService
  let matchingEngineService: MatchingEngineService
  let customLogger: CustomLogger
  let matchingProfileRepository: Repository<MatchingProfile>

  const mockMatchingEngineService = {
    findMatches: jest.fn(),
  }

  const mockCustomLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
  }

  const mockMatchingProfileRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchingValidationService,
        {
          provide: MatchingEngineService,
          useValue: mockMatchingEngineService,
        },
        {
          provide: CustomLogger,
          useValue: mockCustomLogger,
        },
        {
          provide: getRepositoryToken(MatchingProfile),
          useValue: mockMatchingProfileRepository,
        },
      ],
    }).compile()

    service = module.get<MatchingValidationService>(MatchingValidationService)
    matchingEngineService = module.get<MatchingEngineService>(MatchingEngineService)
    customLogger = module.get<CustomLogger>(CustomLogger)
    matchingProfileRepository = module.get<Repository<MatchingProfile>>(getRepositoryToken(MatchingProfile))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("runValidation", () => {
    const mockSourceProfile = {
      userId: "source1",
      preferences: { skill: "JS" },
      weights: { skill: 1 },
      filters: {},
    }
    const mockCandidate1 = { userId: "candidate1", attributes: { skill: "JS" } }
    const mockCandidate2 = { userId: "candidate2", attributes: { skill: "Python" } }

    beforeEach(() => {
      mockMatchingProfileRepository.findOne.mockResolvedValue(mockSourceProfile)
      mockMatchingProfileRepository.find.mockResolvedValue([mockCandidate1, mockCandidate2])
    })

    it("should run validation and generate a report for successful matches", async () => {
      mockMatchingEngineService.findMatches.mockResolvedValue({
        matches: [{ targetId: "candidate1", score: 0.9, confidence: 0.9, reasons: [] }],
        totalProcessed: 2,
        executionTime: 10,
        algorithm: "cosine-similarity",
      })

      const testCases = [
        {
          testCaseId: "test1",
          description: "Should match candidate1",
          sourceUserId: "source1",
          candidateUserIds: ["candidate1", "candidate2"],
          expectedOutcomes: [{ targetId: "candidate1", shouldMatch: true, expectedScoreMin: 0.8 }],
        },
      ]

      const report = await service.runValidation(testCases)

      expect(report.totalTestCases).toBe(1)
      expect(report.passedCases).toBe(1)
      expect(report.failedCases).toBe(0)
      expect(report.overallSuccess).toBe(true)
      expect(report.testCaseReports[0].overallPassed).toBe(true)
      expect(report.testCaseReports[0].results[0].passed).toBe(true)
      expect(report.summaryMetrics.accuracy).toBe(1)
      expect(report.summaryMetrics.precision).toBe(1)
      expect(report.summaryMetrics.recall).toBe(1)
      expect(report.summaryMetrics.f1Score).toBe(1)
      expect(customLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Starting validation run"),
        undefined,
        expect.objectContaining({ category: LogCategory.SYSTEM, action: "validation_start" }),
      )
      expect(customLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Validation run"),
        undefined,
        expect.objectContaining({ category: LogCategory.SYSTEM, action: "validation_complete" }),
      )
    })

    it("should identify failed test cases for unexpected matches", async () => {
      mockMatchingEngineService.findMatches.mockResolvedValue({
        matches: [{ targetId: "candidate2", score: 0.1, confidence: 0.1, reasons: [] }],
        totalProcessed: 2,
        executionTime: 10,
        algorithm: "cosine-similarity",
      })

      const testCases = [
        {
          testCaseId: "test2",
          description: "Should NOT match candidate2",
          sourceUserId: "source1",
          candidateUserIds: ["candidate1", "candidate2"],
          expectedOutcomes: [{ targetId: "candidate2", shouldMatch: false }],
        },
      ]

      const report = await service.runValidation(testCases)

      expect(report.totalTestCases).toBe(1)
      expect(report.passedCases).toBe(1)
      expect(report.failedCases).toBe(0)
      expect(report.overallSuccess).toBe(true)
      expect(report.testCaseReports[0].overallPassed).toBe(true)
      expect(report.testCaseReports[0].results[0].passed).toBe(true)
      expect(report.summaryMetrics.accuracy).toBe(1)
      expect(report.summaryMetrics.precision).toBe(0) // No true positives, but one true negative
      expect(report.summaryMetrics.recall).toBe(0)
      expect(report.summaryMetrics.f1Score).toBe(0)
    })

    it("should identify failed test cases when expected match is not found", async () => {
      mockMatchingEngineService.findMatches.mockResolvedValue({
        matches: [], // No matches found
        totalProcessed: 2,
        executionTime: 10,
        algorithm: "cosine-similarity",
      })

      const testCases = [
        {
          testCaseId: "test3",
          description: "Expected match not found",
          sourceUserId: "source1",
          candidateUserIds: ["candidate1", "candidate2"],
          expectedOutcomes: [{ targetId: "candidate1", shouldMatch: true, expectedScoreMin: 0.8 }],
        },
      ]

      const report = await service.runValidation(testCases)

      expect(report.totalTestCases).toBe(1)
      expect(report.passedCases).toBe(0)
      expect(report.failedCases).toBe(1)
      expect(report.overallSuccess).toBe(false)
      expect(report.testCaseReports[0].overallPassed).toBe(false)
      expect(report.testCaseReports[0].results[0].passed).toBe(false)
      expect(report.summaryMetrics.accuracy).toBe(0)
      expect(report.summaryMetrics.precision).toBe(0)
      expect(report.summaryMetrics.recall).toBe(0)
      expect(report.summaryMetrics.f1Score).toBe(0)
    })

    it("should handle errors during test case execution", async () => {
      mockMatchingEngineService.findMatches.mockRejectedValue(new Error("Matching engine error"))

      const testCases = [
        {
          testCaseId: "test4",
          description: "Error during matching",
          sourceUserId: "source1",
          candidateUserIds: ["candidate1"],
          expectedOutcomes: [{ targetId: "candidate1", shouldMatch: true }],
        },
      ]

      const report = await service.runValidation(testCases)

      expect(report.totalTestCases).toBe(1)
      expect(report.passedCases).toBe(0)
      expect(report.failedCases).toBe(1)
      expect(report.overallSuccess).toBe(false)
      expect(report.testCaseReports[0].overallPassed).toBe(false)
      expect(report.testCaseReports[0].results[0].passed).toBe(false)
      expect(report.testCaseReports[0].results[0].message).toContain("Test case failed due to system error")
      expect(customLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error running test case test4"),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ category: LogCategory.ERROR, action: "validation_test_case_error" }),
      )
    })

    it("should throw BadRequestException if source profile not found", async () => {
      mockMatchingProfileRepository.findOne.mockResolvedValue(null) // Source profile not found

      const testCases = [
        {
          testCaseId: "test5",
          description: "Missing source profile",
          sourceUserId: "nonexistent",
          candidateUserIds: ["candidate1"],
          expectedOutcomes: [{ targetId: "candidate1", shouldMatch: true }],
        },
      ]

      await expect(service.runValidation(testCases)).rejects.toThrow(BadRequestException)
      await expect(service.runValidation(testCases)).rejects.toThrow(
        "Source user profile nonexistent not found for test case test5.",
      )
    })

    it("should throw BadRequestException if a candidate profile is not found", async () => {
      mockMatchingProfileRepository.find.mockResolvedValue([mockCandidate1]) // Only one candidate found

      const testCases = [
        {
          testCaseId: "test6",
          description: "Missing candidate profile",
          sourceUserId: "source1",
          candidateUserIds: ["candidate1", "candidate2"],
          expectedOutcomes: [{ targetId: "candidate1", shouldMatch: true }],
        },
      ]

      await expect(service.runValidation(testCases)).rejects.toThrow(BadRequestException)
      await expect(service.runValidation(testCases)).rejects.toThrow(
        "Missing candidate profiles for test case test6: candidate2",
      )
    })
  })
})
