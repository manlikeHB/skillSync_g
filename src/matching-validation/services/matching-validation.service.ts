import { Injectable, Logger, BadRequestException } from "@nestjs/common"
import type { MatchingEngineService } from "../../matching/services/matching-engine.service"
import type { CustomLogger } from "../../logging-monitoring/services/custom-logger.service"
import { LogCategory } from "../../logging-monitoring/interfaces/log.interface"
import type {
  ValidationTestCase,
  ValidationReport,
  SingleValidationResult,
  TestCaseReport,
  ExpectedMatchOutcome,
} from "../interfaces/validation.interface"
import type { MatchingResult } from "../../matching/interfaces/matching.interface"
import type { MatchingProfile } from "../../matching/entities/matching-profile.entity" // Declare the MatchingProfile variable
import type { Repository } from "typeorm"

@Injectable()
export class MatchingValidationService {
  private readonly logger = new Logger(MatchingValidationService.name)

  constructor(
    private matchingEngineService: MatchingEngineService,
    private customLogger: CustomLogger,
    private matchingProfileRepository: Repository<MatchingProfile>, // Remove the decorator from here
  ) {
    this.customLogger.setContext(MatchingValidationService.name)
  }

  /**
   * Runs a series of validation test cases against the matching engine.
   * @param testCases An array of ValidationTestCase objects.
   * @returns A comprehensive ValidationReport.
   */
  async runValidation(testCases: ValidationTestCase[]): Promise<ValidationReport> {
    const reportStartTime = Date.now()
    const reportId = `validation-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    this.customLogger.log(`Starting validation run: ${reportId} with ${testCases.length} test cases.`, undefined, {
      category: LogCategory.SYSTEM,
      action: "validation_start",
      reportId,
      totalTestCases: testCases.length,
    })

    const testCaseReports: TestCaseReport[] = []
    let passedCases = 0
    let failedCases = 0
    let totalOutcomes = 0
    let passedOutcomes = 0
    let truePositives = 0
    let falsePositives = 0
    let trueNegatives = 0
    let falseNegatives = 0

    for (const testCase of testCases) {
      const caseStartTime = Date.now()
      const results: SingleValidationResult[] = []
      let casePassedOutcomes = 0
      let caseFailedOutcomes = 0
      let caseOverallPassed = true

      try {
        // Fetch source profile to ensure it exists
        const sourceProfile = await this.matchingProfileRepository.findOne({
          where: { userId: testCase.sourceUserId },
        })
        if (!sourceProfile) {
          throw new BadRequestException(
            `Source user profile ${testCase.sourceUserId} not found for test case ${testCase.testCaseId}.`,
          )
        }

        // Fetch candidate profiles to ensure they exist
        const candidateProfiles = await this.matchingProfileRepository.find({
          where: testCase.candidateUserIds.map((id) => ({ userId: id })),
        })

        if (candidateProfiles.length !== testCase.candidateUserIds.length) {
          const missingIds = testCase.candidateUserIds.filter((id) => !candidateProfiles.some((p) => p.userId === id))
          throw new BadRequestException(
            `Missing candidate profiles for test case ${testCase.testCaseId}: ${missingIds.join(", ")}`,
          )
        }

        // Prepare criteria for the matching engine
        const criteria = {
          userId: testCase.sourceUserId,
          preferences: sourceProfile.preferences, // Use source profile's preferences
          weights: sourceProfile.weights, // Use source profile's weights
          filters: sourceProfile.filters, // Use source profile's filters
        }

        // Run matching for the source user against all candidates
        const matchingResponse = await this.matchingEngineService.findMatches(
          {
            criteria,
            limit: testCase.candidateUserIds.length, // Ensure all candidates are considered
            threshold: testCase.threshold,
          },
          testCase.algorithm,
        )

        // Evaluate each expected outcome
        for (const expectedOutcome of testCase.expectedOutcomes) {
          totalOutcomes++
          const actualMatch = matchingResponse.matches.find((m) => m.targetId === expectedOutcome.targetId)
          const validationResult: SingleValidationResult = this.evaluateSingleOutcome(expectedOutcome, actualMatch)
          results.push(validationResult)

          if (validationResult.passed) {
            passedOutcomes++
            casePassedOutcomes++
            if (expectedOutcome.shouldMatch) {
              truePositives++
            } else {
              trueNegatives++
            }
          } else {
            caseFailedOutcomes++
            caseOverallPassed = false
            if (expectedOutcome.shouldMatch) {
              falseNegatives++ // Expected a match but didn't get one
            } else {
              falsePositives++ // Didn't expect a match but got one
            }
          }
        }
      } catch (error) {
        caseOverallPassed = false
        caseFailedOutcomes = testCase.expectedOutcomes.length // Mark all as failed if an error occurs
        this.customLogger.error(
          `Error running test case ${testCase.testCaseId}: ${error.message}`,
          error.stack,
          MatchingValidationService.name,
          {
            category: LogCategory.ERROR,
            action: "validation_test_case_error",
            testCaseId: testCase.testCaseId,
            error: error.message,
          },
        )
        // Add a generic failure result for the test case if an error occurred
        testCase.expectedOutcomes.forEach((expectedOutcome) => {
          totalOutcomes++
          caseFailedOutcomes++
          results.push({
            targetId: expectedOutcome.targetId,
            expected: expectedOutcome,
            actual: undefined,
            passed: false,
            message: `Test case failed due to system error: ${error.message}`,
            details: { error: error.message, stack: error.stack },
          })
          if (expectedOutcome.shouldMatch) {
            falseNegatives++
          } else {
            falsePositives++
          }
        })
      }

      const caseExecutionTime = Date.now() - caseStartTime
      const testCaseReport: TestCaseReport = {
        testCaseId: testCase.testCaseId,
        description: testCase.description,
        algorithmUsed: testCase.algorithm || "cosine-similarity",
        totalCandidates: testCase.candidateUserIds.length,
        totalExpectedOutcomes: testCase.expectedOutcomes.length,
        passedOutcomes: casePassedOutcomes,
        failedOutcomes: caseFailedOutcomes,
        results,
        overallPassed: caseOverallPassed,
        executionTimeMs: caseExecutionTime,
      }
      testCaseReports.push(testCaseReport)

      if (caseOverallPassed) {
        passedCases++
      } else {
        failedCases++
      }
    }

    const totalExecutionTimeMs = Date.now() - reportStartTime
    const overallSuccess = failedCases === 0

    const accuracy = totalOutcomes > 0 ? passedOutcomes / totalOutcomes : 0
    const precision = truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 0
    const recall = truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 0
    const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0

    const validationReport: ValidationReport = {
      reportId,
      timestamp: new Date(),
      totalTestCases: testCases.length,
      passedCases,
      failedCases,
      overallSuccess,
      totalExecutionTimeMs,
      testCaseReports,
      summaryMetrics: {
        accuracy: Math.round(accuracy * 10000) / 10000,
        precision: Math.round(precision * 10000) / 10000,
        recall: Math.round(recall * 10000) / 10000,
        f1Score: Math.round(f1Score * 10000) / 10000,
      },
    }

    this.customLogger.log(`Validation run ${reportId} completed. Overall success: ${overallSuccess}`, undefined, {
      category: LogCategory.SYSTEM,
      action: "validation_complete",
      reportId,
      overallSuccess,
      passedCases,
      failedCases,
      totalExecutionTimeMs,
    })

    return validationReport
  }

  private evaluateSingleOutcome(expected: ExpectedMatchOutcome, actual?: MatchingResult): SingleValidationResult {
    let passed = false
    let message = ""
    const details: Record<string, any> = {}

    if (expected.shouldMatch) {
      if (actual) {
        // Expected a match and got one
        if (
          (expected.expectedScoreMin === undefined || actual.score >= expected.expectedScoreMin) &&
          (expected.expectedScoreMax === undefined || actual.score <= expected.expectedScoreMax)
        ) {
          passed = true
          message = `Expected match found with score ${actual.score}.`
        } else {
          message = `Expected match found, but score ${actual.score} is outside expected range [${expected.expectedScoreMin}-${expected.expectedScoreMax}].`
          details.actualScore = actual.score
          details.expectedScoreMin = expected.expectedScoreMin
          details.expectedScoreMax = expected.expectedScoreMax
        }
      } else {
        // Expected a match but didn't get one
        message = `Expected a match for ${expected.targetId} but no match was found.`
      }
    } else {
      if (actual) {
        // Expected no match but got one (False Positive)
        message = `Expected NO match for ${expected.targetId} but a match was found with score ${actual.score}.`
        details.actualScore = actual.score
      } else {
        // Expected no match and got none
        passed = true
        message = `Expected no match for ${expected.targetId} and none was found.`
      }
    }

    return {
      targetId: expected.targetId,
      expected,
      actual,
      passed,
      message,
      details,
    }
  }
}
