export interface MatchingCriteria {
  userId: string
  preferences: Record<string, any>
  weights: Record<string, number>
  filters: Record<string, any>
}

export interface MatchingResult {
  targetId: string
  score: number
  confidence: number
  reasons: string[]
  metadata: Record<string, any>
}

export interface MatchingRequest {
  criteria: MatchingCriteria
  limit?: number
  threshold?: number
}

export interface MatchingResponse {
  matches: MatchingResult[]
  totalProcessed: number
  executionTime: number
  algorithm: string
}

export interface MatchingAlgorithm {
  name: string
  calculate(source: any, target: any, criteria: MatchingCriteria): Promise<MatchingResult>
}
