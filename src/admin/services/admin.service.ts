import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { MatchingProfile } from "../../matching/entities/matching-profile.entity"
import type { MatchingResultEntity } from "../../matching/entities/matching-result.entity"
import type { ManualMatch } from "../../matching/entities/manual-match.entity"
import type { Log } from "../../logging-monitoring/entities/log.entity"
import type { MatchingEngineService } from "../../matching/services/matching-engine.service"
import type { AdminMatchingService } from "../../matching/services/admin-matching.service"
import type { LoggingMonitoringService } from "../../logging-monitoring/services/logging-monitoring.service"
import type { CustomLogger } from "../../logging-monitoring/services/custom-logger.service"
import { LogCategory } from "../../logging-monitoring/interfaces/log.interface"
import type {
  AdminDashboardSummary,
  UserProfileSummary,
  UpdateUserProfileDto,
  AdminLogFilterDto,
} from "../interfaces/admin.interface"

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name)

  constructor(
    private matchingProfileRepository: Repository<MatchingProfile>,
    private matchingResultRepository: Repository<MatchingResultEntity>,
    private manualMatchRepository: Repository<ManualMatch>,
    private logRepository: Repository<Log>,
    private matchingEngineService: MatchingEngineService,
    private adminMatchingService: AdminMatchingService,
    private loggingMonitoringService: LoggingMonitoringService,
    private customLogger: CustomLogger,
  ) {
    this.customLogger.setContext(AdminService.name)
  }

  /**
   * Retrieves a summary for the admin dashboard.
   */
  async getDashboardSummary(): Promise<AdminDashboardSummary> {
    try {
      const totalUsers = await this.matchingProfileRepository.count()
      const activeUsers = await this.matchingProfileRepository.count({ where: { isActive: true } })
      const totalAiMatches = await this.matchingResultRepository.count()
      const totalManualMatches = await this.manualMatchRepository.count()

      const logStats = await this.loggingMonitoringService.getLogStatistics()
      const healthStatus = await this.loggingMonitoringService.getHealthStatus()

      return {
        totalUsers,
        activeUsers,
        totalAiMatches,
        totalManualMatches,
        recentErrors: logStats.recentErrors.map((log) => ({
          message: log.message,
          timestamp: log.timestamp || new Date(),
          level: log.level,
        })),
        recentRecommendations: logStats.recentRecommendations.map((log) => ({
          message: log.message,
          timestamp: log.timestamp || new Date(),
          userId: log.userId,
        })),
        systemHealth: {
          status: healthStatus.status,
          database: healthStatus.database,
        },
      }
    } catch (error) {
      this.customLogger.error(`Failed to get dashboard summary: ${error.message}`, error.stack, AdminService.name, {
        category: LogCategory.SYSTEM,
        action: "get_dashboard_summary",
      })
      throw error
    }
  }

  /**
   * Retrieves a list of all user profiles with summary information.
   */
  async getAllUserProfilesSummary(): Promise<UserProfileSummary[]> {
    const profiles = await this.matchingProfileRepository.find({
      select: [
        "userId",
        "isActive",
        "attributes",
        "preferences",
        "createdAt",
        "updatedAt",
        "matchCount",
        "averageScore",
      ],
      order: { createdAt: "DESC" },
    })
    return profiles.map((profile) => ({
      userId: profile.userId,
      isActive: profile.isActive,
      attributes: profile.attributes,
      preferences: profile.preferences,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      matchCount: profile.matchCount,
      averageScore: profile.averageScore,
    }))
  }

  /**
   * Retrieves a detailed user profile.
   * @param userId The ID of the user.
   */
  async getUserProfileDetails(userId: string): Promise<MatchingProfile> {
    const profile = await this.matchingProfileRepository.findOne({ where: { userId } })
    if (!profile) {
      throw new NotFoundException(`User profile with ID ${userId} not found.`)
    }
    return profile
  }

  /**
   * Updates a user profile.
   * @param userId The ID of the user to update.
   * @param updates The partial updates for the profile.
   * @param adminUserId The ID of the administrator performing the action.
   */
  async updateUserProfile(
    userId: string,
    updates: UpdateUserProfileDto,
    adminUserId: string,
  ): Promise<MatchingProfile> {
    const profile = await this.matchingProfileRepository.findOne({ where: { userId } })
    if (!profile) {
      throw new NotFoundException(`User profile with ID ${userId} not found.`)
    }

    Object.assign(profile, updates)
    const updatedProfile = await this.matchingProfileRepository.save(profile)

    this.customLogger.log(`User profile ${userId} updated by ${adminUserId}`, AdminService.name, {
      category: LogCategory.PROFILE,
      action: "admin_update_profile",
      userId,
      adminUserId,
      updates,
    })
    return updatedProfile
  }

  /**
   * Deactivates a user profile.
   * @param userId The ID of the user to deactivate.
   * @param adminUserId The ID of the administrator performing the action.
   */
  async deactivateUserProfile(userId: string, adminUserId: string): Promise<MatchingProfile> {
    const profile = await this.updateUserProfile(userId, { isActive: false }, adminUserId)
    this.customLogger.log(`User profile ${userId} deactivated by ${adminUserId}`, AdminService.name, {
      category: LogCategory.PROFILE,
      action: "admin_deactivate_profile",
      userId,
      adminUserId,
    })
    return profile
  }

  /**
   * Activates a user profile.
   * @param userId The ID of the user to activate.
   * @param adminUserId The ID of the administrator performing the action.
   */
  async activateUserProfile(userId: string, adminUserId: string): Promise<MatchingProfile> {
    const profile = await this.updateUserProfile(userId, { isActive: true }, adminUserId)
    this.customLogger.log(`User profile ${userId} activated by ${adminUserId}`, AdminService.name, {
      category: LogCategory.PROFILE,
      action: "admin_activate_profile",
      userId,
      adminUserId,
    })
    return profile
  }

  /**
   * Retrieves all AI-generated matching results.
   */
  async getAllAiMatches(): Promise<MatchingResultEntity[]> {
    return this.matchingResultRepository.find({ order: { createdAt: "DESC" } })
  }

  /**
   * Retrieves all manual match adjustments.
   */
  async getAllManualMatchAdjustments(): Promise<ManualMatch[]> {
    return this.adminMatchingService.getAllManualMatches()
  }

  /**
   * Retrieves system logs with filtering capabilities.
   */
  async getSystemLogs(filters: AdminLogFilterDto): Promise<Log[]> {
    const { level, category, userId, startDate, endDate, limit, offset } = filters
    return this.loggingMonitoringService.getLogs(
      level,
      category,
      userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      limit,
      offset,
    )
  }
}
