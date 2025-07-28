import { Injectable } from "@nestjs/common"
import type { MatchingAlgorithm, MatchingCriteria, MatchingResult } from "../interfaces/matching.interface"

@Injectable()
export class CosineSimilarityAlgorithm implements MatchingAlgorithm {
  name = "cosine-similarity"

  async calculate(source: any, target: any, criteria: MatchingCriteria): Promise<MatchingResult> {
    const sourceVector = this.extractFeatureVector(source, criteria)
    const targetVector = this.extractFeatureVector(target, criteria)

    const similarity = this.cosineSimilarity(sourceVector, targetVector)
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
        rawSimilarity: similarity,
        vectorLength: sourceVector.length,
      },
    }
  }

  private extractFeatureVector(profile: any, criteria: MatchingCriteria): number[] {
    const vector: number[] = []
    const attributes = profile.attributes || {}

    // Extract numerical features
    Object.keys(criteria.preferences).forEach((key) => {
      if (typeof attributes[key] === "number") {
        vector.push(attributes[key])
      } else if (typeof attributes[key] === "boolean") {
        vector.push(attributes[key] ? 1 : 0)
      } else if (Array.isArray(attributes[key])) {
        vector.push(attributes[key].length)
      } else {
        vector.push(0)
      }
    })

    return vector
  }

  private cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error("Vectors must have the same length")
    }

    const dotProduct = vectorA.reduce((sum, a, i) => sum + a * vectorB[i], 0)
    const magnitudeA = Math.sqrt(vectorA.reduce((sum, a) => sum + a * a, 0))
    const magnitudeB = Math.sqrt(vectorB.reduce((sum, b) => sum + b * b, 0))

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0
    }

    return dotProduct / (magnitudeA * magnitudeB)
  }

  private applyWeights(score: number, weights: Record<string, number>): number {
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0)
    if (totalWeight === 0) return score

    // Apply weighted adjustment
    const weightMultiplier = totalWeight / Object.keys(weights).length
    return Math.min(1, score * weightMultiplier)
  }

  private calculateConfidence(vectorA: number[], vectorB: number[]): number {
    const nonZeroA = vectorA.filter((v) => v !== 0).length
    const nonZeroB = vectorB.filter((v) => v !== 0).length
    const totalFeatures = vectorA.length

    const dataCompleteness = (nonZeroA + nonZeroB) / (2 * totalFeatures)
    return Math.min(1, dataCompleteness)
  }

  private generateReasons(source: any, target: any, criteria: MatchingCriteria, score: number): string[] {
    const reasons: string[] = []

    if (score > 0.8) {
      reasons.push("High compatibility across multiple attributes")
    } else if (score > 0.6) {
      reasons.push("Good compatibility with some strong matches")
    } else if (score > 0.4) {
      reasons.push("Moderate compatibility with potential for growth")
    } else {
      reasons.push("Limited compatibility based on current criteria")
    }

    // Add specific attribute-based reasons
    Object.keys(criteria.preferences).forEach((key) => {
      const sourceValue = source.attributes?.[key]
      const targetValue = target.attributes?.[key]
      const weight = criteria.weights[key] || 1

      if (weight > 1.5 && this.attributesMatch(sourceValue, targetValue)) {
        reasons.push(`Strong match in ${key}`)
      }
    })

    return reasons
  }

  private attributesMatch(sourceValue: any, targetValue: any): boolean {
    if (typeof sourceValue === "number" && typeof targetValue === "number") {
      return Math.abs(sourceValue - targetValue) < 0.2
    }
    return sourceValue === targetValue
  }
}
