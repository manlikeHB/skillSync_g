import type { MatchingResult } from "../../matching/interfaces/matching.interface"

export interface ExpectedMatchOutcome {
  targetId: string
  expectedScoreMin?: number // Minimum expected score
  expectedScoreMax?: number // Maximum expected score
  shouldMatch: boolean // True if a match is expected, false if no match is expected
  reasonHint?: string // Hint for expected reasons
}

export interface ValidationTestCase {
  testCaseId: string
  description: string
  sourceUserId: string
  candidateUserIds: string[] // IDs of profiles to test against the source
  expectedOutcomes: ExpectedMatchOutcome[] // What we expect for each candidate
  algorithm?: string // Algorithm to use for this test case (defaults to cosine-similarity)
  threshold?: number // Override default matching threshold for this test case
}

export interface SingleValidationResult {
  targetId: string
  expected: ExpectedMatchOutcome
  actual?: MatchingResult // Actual result from the matching engine
  passed: boolean
  message: string
  details?: Record<string, any>
}

export interface TestCaseReport {
  testCaseId: string
  description: string
  algorithmUsed: string
  totalCandidates: number
  totalExpectedOutcomes: number
  passedOutcomes: number
  failedOutcomes: number
  results: SingleValidationResult[]
  overallPassed: boolean
  executionTimeMs: number
}

export interface ValidationReport {
  reportId: string
  timestamp: Date
  totalTestCases: number
  passedCases: number
  failedCases: number
  overallSuccess: boolean
  totalExecutionTimeMs: number
  testCaseReports: TestCaseReport[]
  summaryMetrics: {
    accuracy: number // (Passed Outcomes / Total Outcomes)
    precision?: number // (True Positives / (True Positives + False Positives))
    recall?: number // (True Positives / (True Positives + False Negatives))
    f1Score?: number
  }
}
