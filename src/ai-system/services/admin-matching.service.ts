import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { ManualMatch } from "../entities/manual-match.entity"
import type { MatchingResultEntity } from "../entities/matching-result.entity"
import type { MatchingProfile } from "../entities/matching-profile.entity"
import type { CustomLogger } from "../../logging-monitoring/services/custom-logger.service"
import { LogCategory } from "../../logging-monitoring/interfaces/log.interface"

@Injectable()
export class AdminMatchingService {
  private readonly logger = new Logger(AdminMatchingService.name)

  constructor(
    private manualMatchRepository: Repository<ManualMatch>,
    private matchingResultRepository: Repository<MatchingResultEntity>,
    private matchingProfileRepository: Repository<MatchingProfile>,
    private customLogger: CustomLogger,
  ) {
    this.customLogger.setContext(AdminMatchingService.name)
  }

  /**
   * Creates a new manual match between two users.
   * @param sourceUserId The ID of the source user (e.g., mentor).
   * @param targetUserId The ID of the target user (e.g., mentee).
   * @param overrideScore The manually set score for the match.
   * @param overrideConfidence The manually set confidence for the match.
   * @param reason The reason for creating this manual match.
   * @param adminUserId The ID of the administrator performing the action.
   * @returns The created ManualMatch entity.
   */
  async createManualMatch(
    sourceUserId: string,
    targetUserId: string,
    overrideScore: number,
    overrideConfidence: number,
    reason: string,
    adminUserId: string,
  ): Promise<ManualMatch> {
    // Basic validation
    if (!sourceUserId || !targetUserId || !adminUserId) {
      throw new BadRequestException("Source user, target user, and admin user IDs are required.")
    }
    if (overrideScore < 0 || overrideScore > 1 || overrideConfidence < 0 || overrideConfidence > 1) {
      throw new BadRequestException("Score and confidence must be between 0 and 1.")
    }

    // Ensure both users exist as profiles
    const sourceProfile = await this.matchingProfileRepository.findOne({ where: { userId: sourceUserId } })
    const targetProfile = await this.matchingProfileRepository.findOne({ where: { userId: targetUserId } })

    if (!sourceProfile || !targetProfile) {
      throw new NotFoundException("One or both user profiles not found.")
    }

    const manualMatch = this.manualMatchRepository.create({
      sourceUserId,
      targetUserId,
      overrideScore,
      overrideConfidence,
      reason,
      adminUserId,
      isActive: true,
    })

    const savedMatch = await this.manualMatchRepository.save(manualMatch)
    this.customLogger.log(
      `Manual match created: ${sourceUserId} <-> ${targetUserId} by ${adminUserId}`,
      AdminMatchingService.name,
      {
        category: LogCategory.MATCHING,
        action: "manual_create",
        manualMatchId: savedMatch.id,
        sourceUserId,
        targetUserId,
        adminUserId,
      },
    )
    return savedMatch
  }

  /**
   * Updates an existing manual match.
   * @param id The ID of the manual match to update.
   * @param updates Partial updates for the ManualMatch entity.
   * @param adminUserId The ID of the administrator performing the action.
   * @returns The updated ManualMatch entity.
   */
  async updateManualMatch(id: string, updates: Partial<ManualMatch>, adminUserId: string): Promise<ManualMatch> {
    const manualMatch = await this.manualMatchRepository.findOne({ where: { id } })
    if (!manualMatch) {
      throw new NotFoundException(`Manual match with ID ${id} not found.`)
    }

    // Prevent changing immutable fields or invalid scores/confidence
    if (updates.sourceUserId || updates.targetUserId || updates.adminUserId || updates.originalMatchId) {
      throw new BadRequestException("Cannot change source, target, admin, or original match IDs directly.")
    }
    if (
      (updates.overrideScore !== undefined && (updates.overrideScore < 0 || updates.overrideScore > 1)) ||
      (updates.overrideConfidence !== undefined && (updates.overrideConfidence < 0 || updates.overrideConfidence > 1))
    ) {
      throw new BadRequestException("Score and confidence must be between 0 and 1.")
    }

    Object.assign(manualMatch, updates)
    const updatedMatch = await this.manualMatchRepository.save(manualMatch)
    this.customLogger.log(`Manual match updated: ${id} by ${adminUserId}`, AdminMatchingService.name, {
      category: LogCategory.MATCHING,
      action: "manual_update",
      manualMatchId: updatedMatch.id,
      adminUserId,
      updates,
    })
    return updatedMatch
  }

  /**
   * Deletes a manual match.
   * @param id The ID of the manual match to delete.
   * @param adminUserId The ID of the administrator performing the action.
   */
  async deleteManualMatch(id: string, adminUserId: string): Promise<void> {
    const result = await this.manualMatchRepository.delete(id)
    if (result.affected === 0) {
      throw new NotFoundException(`Manual match with ID ${id} not found.`)
    }
    this.customLogger.log(`Manual match deleted: ${id} by ${adminUserId}`, AdminMatchingService.name, {
      category: LogCategory.MATCHING,
      action: "manual_delete",
      manualMatchId: id,
      adminUserId,
    })
  }

  /**
   * Retrieves all manual matches.
   * @returns An array of ManualMatch entities.
   */
  async getAllManualMatches(): Promise<ManualMatch[]> {
    return this.manualMatchRepository.find({ order: { createdAt: "DESC" } })
  }

  /**
   * Overrides an existing AI-generated match with manual adjustments.
   * This creates a new ManualMatch entry and marks the original AI match as overridden.
   * @param originalMatchId The ID of the AI-generated match to override.
   * @param overrideScore The new score for the match.
   * @param overrideConfidence The new confidence for the match.
   * @param reason The reason for the override.
   * @param adminUserId The ID of the administrator performing the action.
   * @returns The created ManualMatch entity that represents the override.
   */
  async overrideAiMatch(
    originalMatchId: string,
    overrideScore: number,
    overrideConfidence: number,
    reason: string,
    adminUserId: string,
  ): Promise<ManualMatch> {
    const originalMatch = await this.matchingResultRepository.findOne({ where: { id: originalMatchId } })
    if (!originalMatch) {
      throw new NotFoundException(`Original AI match with ID ${originalMatchId} not found.`)
    }

    if (originalMatch.isOverridden) {
      throw new BadRequestException(`AI match ${originalMatchId} is already overridden.`)
    }

    // Create a new manual match entry for the override
    const manualMatch = this.manualMatchRepository.create({
      sourceUserId: originalMatch.sourceUserId,
      targetUserId: originalMatch.targetUserId,
      overrideScore,
      overrideConfidence,
      reason,
      adminUserId,
      isActive: true,
      originalMatchId: originalMatch.id,
    })

    const savedManualMatch = await this.manualMatchRepository.save(manualMatch)

    // Mark the original AI match as overridden
    originalMatch.isOverridden = true
    originalMatch.overriddenByManualMatchId = savedManualMatch.id
    await this.matchingResultRepository.save(originalMatch)

    this.customLogger.log(
      `AI match overridden: ${originalMatchId} by ${adminUserId}. New manual match ID: ${savedManualMatch.id}`,
      AdminMatchingService.name,
      {
        category: LogCategory.MATCHING,
        action: "ai_override",
        originalMatchId,
        manualMatchId: savedManualMatch.id,
        adminUserId,
        reason,
      },
    )

    return savedManualMatch
  }

  /**
   * Retrieves a specific manual match by its ID.
   * @param id The ID of the manual match.
   * @returns The ManualMatch entity.
   */
  async getManualMatchById(id: string): Promise<ManualMatch> {
    const manualMatch = await this.manualMatchRepository.findOne({ where: { id } })
    if (!manualMatch) {
      throw new NotFoundException(`Manual match with ID ${id} not found.`)
    }
    return manualMatch
  }
}
