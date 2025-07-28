import { Controller, Get, Put, Body, Query, HttpStatus, HttpException } from "@nestjs/common"
import type { AdminService } from "../services/admin.service"
import type { MatchingProfile } from "../../matching/entities/matching-profile.entity"
import type { MatchingResultEntity } from "../../matching/entities/matching-result.entity"
import type { ManualMatch } from "../../matching/entities/manual-match.entity"
import type { Log } from "../../logging-monitoring/entities/log.entity"
import type {
  AdminDashboardSummary,
  UserProfileSummary,
  UpdateUserProfileDto,
  AdminLogFilterDto,
} from "../interfaces/admin.interface"

@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // --- Dashboard & Overview ---
  @Get("dashboard-summary")
  async getDashboardSummary(): Promise<AdminDashboardSummary> {
    try {
      return await this.adminService.getDashboardSummary()
    } catch (error) {
      throw new HttpException(`Failed to get dashboard summary: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  // --- User Profile Management ---
  @Get("users")
  async getAllUserProfilesSummary(): Promise<UserProfileSummary[]> {
    try {
      return await this.adminService.getAllUserProfilesSummary()
    } catch (error) {
      throw new HttpException(`Failed to get user profiles: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Get("users/:userId")
  async getUserProfileDetails(userId: string): Promise<MatchingProfile> {
    try {
      return await this.adminService.getUserProfileDetails(userId)
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.NOT_FOUND)
    }
  }

  @Put("users/:userId")
  async updateUserProfile(
    userId: string,
    @Body() updates: UpdateUserProfileDto,
    @Body("adminUserId") adminUserId: string, // Assuming adminUserId is passed in body for logging
  ): Promise<MatchingProfile> {
    if (!adminUserId) {
      throw new HttpException("adminUserId is required for this operation.", HttpStatus.BAD_REQUEST)
    }
    try {
      return await this.adminService.updateUserProfile(userId, updates, adminUserId)
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST)
    }
  }

  @Put("users/:userId/deactivate")
  async deactivateUserProfile(userId: string, @Body("adminUserId") adminUserId: string): Promise<MatchingProfile> {
    if (!adminUserId) {
      throw new HttpException("adminUserId is required for this operation.", HttpStatus.BAD_REQUEST)
    }
    try {
      return await this.adminService.deactivateUserProfile(userId, adminUserId)
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST)
    }
  }

  @Put("users/:userId/activate")
  async activateUserProfile(userId: string, @Body("adminUserId") adminUserId: string): Promise<MatchingProfile> {
    if (!adminUserId) {
      throw new HttpException("adminUserId is required for this operation.", HttpStatus.BAD_REQUEST)
    }
    try {
      return await this.adminService.activateUserProfile(userId, adminUserId)
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST)
    }
  }

  // --- Matching Data Review ---
  @Get("matches/ai")
  async getAllAiMatches(): Promise<MatchingResultEntity[]> {
    try {
      return await this.adminService.getAllAiMatches()
    } catch (error) {
      throw new HttpException(`Failed to get AI matches: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Get("matches/manual")
  async getAllManualMatchAdjustments(): Promise<ManualMatch[]> {
    try {
      return await this.adminService.getAllManualMatchAdjustments()
    } catch (error) {
      throw new HttpException(`Failed to get manual matches: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  // --- Logging & Monitoring Access ---
  @Get("logs")
  async getSystemLogs(@Query() filters: AdminLogFilterDto): Promise<Log[]> {
    try {
      return await this.adminService.getSystemLogs(filters)
    } catch (error) {
      throw new HttpException(`Failed to get system logs: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}
