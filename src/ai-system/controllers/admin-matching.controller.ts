import { Controller, Post, Put, Delete, Get, Param, Body, HttpStatus, HttpException } from "@nestjs/common"
import type { AdminMatchingService } from "../services/admin-matching.service"
import type { ManualMatch } from "../entities/manual-match.entity"

@Controller("admin/matching")
export class AdminMatchingController {
  constructor(private readonly adminMatchingService: AdminMatchingService) {}

  @Post("manual")
  async createManualMatch(body: {
    sourceUserId: string
    targetUserId: string
    overrideScore: number
    overrideConfidence: number
    reason: string
    adminUserId: string
  }): Promise<ManualMatch> {
    try {
      return await this.adminMatchingService.createManualMatch(
        body.sourceUserId,
        body.targetUserId,
        body.overrideScore,
        body.overrideConfidence,
        body.reason,
        body.adminUserId,
      )
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST)
    }
  }

  @Put("manual/:id")
  async updateManualMatch(
    @Param("id") id: string,
    updates: Partial<ManualMatch>,
    @Body("adminUserId") adminUserId: string, // Assuming adminUserId is passed in body for logging
  ): Promise<ManualMatch> {
    if (!adminUserId) {
      throw new HttpException("adminUserId is required for this operation.", HttpStatus.BAD_REQUEST)
    }
    try {
      return await this.adminMatchingService.updateManualMatch(id, updates, adminUserId)
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST)
    }
  }

  @Delete("manual/:id")
  async deleteManualMatch(
    @Param("id") id: string,
    @Body("adminUserId") adminUserId: string, // Assuming adminUserId is passed in body for logging
  ): Promise<{ message: string }> {
    if (!adminUserId) {
      throw new HttpException("adminUserId is required for this operation.", HttpStatus.BAD_REQUEST)
    }
    try {
      await this.adminMatchingService.deleteManualMatch(id, adminUserId)
      return { message: `Manual match ${id} deleted successfully.` }
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.NOT_FOUND)
    }
  }

  @Get("manual")
  async getAllManualMatches(): Promise<ManualMatch[]> {
    try {
      return await this.adminMatchingService.getAllManualMatches()
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Get("manual/:id")
  async getManualMatchById(@Param("id") id: string): Promise<ManualMatch> {
    try {
      return await this.adminMatchingService.getManualMatchById(id)
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.NOT_FOUND)
    }
  }

  @Post("override-ai/:originalMatchId")
  async overrideAiMatch(
    @Param("originalMatchId") originalMatchId: string,
    body: {
      overrideScore: number
      overrideConfidence: number
      reason: string
      adminUserId: string
    },
  ): Promise<ManualMatch> {
    try {
      return await this.adminMatchingService.overrideAiMatch(
        originalMatchId,
        body.overrideScore,
        body.overrideConfidence,
        body.reason,
        body.adminUserId,
      )
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST)
    }
  }
}
