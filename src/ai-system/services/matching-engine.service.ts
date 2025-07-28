import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { MatchingProfile } from "../entities/matching-profile.entity"
import type { MatchingResultEntity } from "../entities/matching-result.entity"
import type {
  MatchingRequest,
  MatchingResponse,
  MatchingResult,
  MatchingAlgorithm,
} from "../interfaces/matching.interface"
import type { CosineSimilarityAlgorithm } from "../algorithms/cosine-similarity.algorithm"
import type { EuclideanDistanceAlgorithm } from "../algorithms/euclidean-distance.algorithm"

@Injectable()
export class MatchingEngineService {
  private readonly logger = new Logger(MatchingEngineService.name)
  private algorithms: Map<string, MatchingAlgorithm> = new Map()

  constructor(
    private matchingProfileRepository: Repository<MatchingProfile>,
    private matchingResultRepository: Repository<MatchingResultEntity>,
    private cosineSimilarityAlgorithm: CosineSimilarityAlgorithm,
    private euclideanDistanceAlgorithm: EuclideanDistanceAlgorithm,
  ) {
    this.initializeAlgorithms()
  }

  private initializeAlgorithms(): void {
    this.algorithms.set("cosine-similarity", this.cosineSimilarityAlgorithm)
    this.algorithms.set("euclidean-distance", this.euclideanDistanceAlgorithm)
  }

  async findMatches(request: MatchingRequest, algorithmName = "cosine-similarity"): Promise<MatchingResponse> {
    const startTime = Date.now()

    try {
      this.logger.log(`Starting matching process for user ${request.criteria.userId} using ${algorithmName}`)

      const algorithm = this.algorithms.get(algorithmName)
      if (!algorithm) {
        throw new Error(`Algorithm ${algorithmName} not found`)
      }

      // Get source profile
      const sourceProfile = await this.getProfile(request.criteria.userId)
      if (!sourceProfile) {
        throw new Error(`Source profile not found for user ${request.criteria.userId}`)
      }

      // Get candidate profiles
      const candidates = await this.getCandidateProfiles(request.criteria.userId, request.limit || 100)

      // Calculate matches
      const matches: MatchingResult[] = []
      for (const candidate of candidates) {
        if (this.passesFilters(candidate, request.criteria.filters)) {
          const result = await algorithm.calculate(sourceProfile, candidate, request.criteria)

          if (result.score >= (request.threshold || 0.1)) {
            matches.push(result)
          }
        }
      }

      // Sort by score descending
      matches.sort((a, b) => b.score - a.score)

      // Limit results
      const limitedMatches = matches.slice(0, request.limit || 50)

      // Store results
      await this.storeMatchingResults(request.criteria.userId, limitedMatches, algorithmName, request.criteria)

      const executionTime = Date.now() - startTime

      this.logger.log(`Matching completed: ${limitedMatches.length} matches found in ${executionTime}ms`)

      return {
        matches: limitedMatches,
        totalProcessed: candidates.length,
        executionTime,
        algorithm: algorithmName,
      }
    } catch (error) {
      this.logger.error(`Matching failed: ${error.message}`, error.stack)
      throw error
    }
  }

  async createProfile(
    userId: string,
    attributes: Record<string, any>,
    preferences: Record<string, any>,
  ): Promise<MatchingProfile> {
    const existingProfile = await this.matchingProfileRepository.findOne({ where: { userId } })

    if (existingProfile) {
      existingProfile.attributes = attributes
      existingProfile.preferences = preferences
      existingProfile.updatedAt = new Date()
      return await this.matchingProfileRepository.save(existingProfile)
    }

    const profile = this.matchingProfileRepository.create({
      userId,
      attributes,
      preferences,
      weights: this.generateDefaultWeights(preferences),
      filters: {},
      metadata: {},
    })

    return await this.matchingProfileRepository.save(profile)
  }

  async updateProfile(userId: string, updates: Partial<MatchingProfile>): Promise<MatchingProfile> {
    const profile = await this.getProfile(userId)
    if (!profile) {
      throw new Error(`Profile not found for user ${userId}`)
    }

    Object.assign(profile, updates)
    return await this.matchingProfileRepository.save(profile)
  }

  async getProfile(userId: string): Promise<MatchingProfile | null> {
    return await this.matchingProfileRepository.findOne({
      where: { userId, isActive: true },
    })
  }

  async getMatchingHistory(userId: string, limit = 50): Promise<MatchingResultEntity[]> {
    return await this.matchingResultRepository.find({
      where: { sourceUserId: userId },
      order: { createdAt: "DESC" },
      take: limit,
    })
  }

  private async getCandidateProfiles(excludeUserId: string, limit: number): Promise<MatchingProfile[]> {
    return await this.matchingProfileRepository
      .createQueryBuilder("profile")
      .where("profile.userId != :excludeUserId", { excludeUserId })
      .andWhere("profile.isActive = :isActive", { isActive: true })
      .orderBy("profile.updatedAt", "DESC")
      .limit(limit)
      .getMany()
  }

  private passesFilters(profile: MatchingProfile, filters: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(filters)) {
      const profileValue = profile.attributes[key]

      if (typeof value === "object" && value.min !== undefined && value.max !== undefined) {
        if (profileValue < value.min || profileValue > value.max) {
          return false
        }
      } else if (Array.isArray(value)) {
        if (!value.includes(profileValue)) {
          return false
        }
      } else if (profileValue !== value) {
        return false
      }
    }

    return true
  }

  private async storeMatchingResults(
    sourceUserId: string,
    matches: MatchingResult[],
    algorithm: string,
    criteria: any,
  ): Promise<void> {
    const entities = matches.map((match) =>
      this.matchingResultRepository.create({
        sourceUserId,
        targetUserId: match.targetId,
        score: match.score,
        confidence: match.confidence,
        algorithm,
        reasons: match.reasons,
        metadata: match.metadata,
        criteria,
      }),
    )

    await this.matchingResultRepository.save(entities)
  }

  private generateDefaultWeights(preferences: Record<string, any>): Record<string, number> {
    const weights: Record<string, number> = {}

    Object.keys(preferences).forEach((key) => {
      weights[key] = 1.0 // Default weight
    })

    return weights
  }
}
