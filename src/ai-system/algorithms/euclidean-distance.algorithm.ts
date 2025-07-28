import { Injectable } from "@nestjs/common"
import type { MatchingAlgorithm, MatchingCriteria, MatchingResult } from "../interfaces/matching.interface"

@Injectable()
export class EuclideanDistanceAlgorithm implements MatchingAlgorithm {
  name = "euclidean-distance"

  async calculate(source: any, target: any, criteria: MatchingCriteria): Promise<MatchingResult> {
    const sourceVector = this.extractFeatureVector(source, criteria)
    const targetVector = this.extractFeatureVector(target, criteria)

    const distance = this.euclideanDistance(sourceVector, targetVector)
    const similarity = this.distanceToSimilarity(distance)
    const weightedScore = this.applyWeights(similarity, criteria.weights)
    const confidence = this.calculateConfidence(sourceVector, targetVector)
    const reasons = this.generateReasons(source, target, criteria, weightedScore)

    return {
      targetId: target.userId,
      score: Math.round(weightedScore * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      reasons,
      metadata: {
        algorithm: this.name,
        rawDistance: distance,
        similarity: similarity,
      },
    }
  }

  private extractFeatureVector(profile: any, criteria: MatchingCriteria): number[] {
    const vector: number[] = []
    const attributes = profile.attributes || {}

    Object.keys(criteria.preferences).forEach((key) => {
      const value = attributes[key]
      if (typeof value === "number") {
        vector.push(this.normalizeValue(value, key))
      } else if (typeof value === "boolean") {
        vector.push(value ? 1 : 0)
      } else if (Array.isArray(value)) {
        vector.push(Math.min(value.length / 10, 1)) // Normalize array length
      } else {
        vector.push(0)
      }
    })

    return vector
  }

  private normalizeValue(value: number, key: string): number {
    // Simple normalization - in production, you'd use actual min/max values
    const ranges: Record<string, { min: number; max: number }> = {
      age: { min: 18, max: 80 },
      income: { min: 0, max: 200000 },
      rating: { min: 0, max: 5 },
    }

    const range = ranges[key] || { min: 0, max: 100 }
    return (value - range.min) / (range.max - range.min)
  }

  private euclideanDistance(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error("Vectors must have the same length")
    }

    const sumSquaredDifferences = vectorA.reduce((sum, a, i) => sum + Math.pow(a - vectorB[i], 2), 0)

    return Math.sqrt(sumSquaredDifferences)
  }

  private distanceToSimilarity(distance: number): number {
    // Convert distance to similarity score (0-1)
    return 1 / (1 + distance)
  }

  private applyWeights(score: number, weights: Record<string, number>): number {
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0)
    if (totalWeight === 0) return score

    const avgWeight = totalWeight / Object.keys(weights).length
    return Math.min(1, score * (avgWeight / 1.0))
  }

  private calculateConfidence(vectorA: number[], vectorB: number[]): number {
    const variance = this.calculateVariance([...vectorA, ...vectorB])
    return Math.max(0.1, Math.min(1, 1 - variance))
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const squaredDifferences = values.map((val) => Math.pow(val - mean, 2))
    return squaredDifferences.reduce((sum, val) => sum + val, 0) / values.length
  }

  private generateReasons(source: any, target: any, criteria: MatchingCriteria, score: number): string[] {
    const reasons: string[] = []

    if (score > 0.8) {
      reasons.push("Very close match across all measured attributes")
    } else if (score > 0.6) {
      reasons.push("Good overall compatibility with minor differences")
    } else if (score > 0.4) {
      reasons.push("Moderate compatibility with some notable differences")
    } else {
      reasons.push("Significant differences in key attributes")
    }

    return reasons
  }
}
