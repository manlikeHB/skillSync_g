import { Controller, Post, Get, Put, Param, Query, HttpStatus, HttpException } from "@nestjs/common"
import type { MatchingEngineService } from "../services/matching-engine.service"
import type { MatchingRequest, MatchingResponse } from "../interfaces/matching.interface"
import type { MatchingProfile } from "../entities/matching-profile.entity"

@Controller("matching")
export class MatchingController {
  constructor(private readonly matchingEngineService: MatchingEngineService) {}

  @Post("find")
  async findMatches(request: MatchingRequest, @Query('algorithm') algorithm?: string): Promise<MatchingResponse> {
    try {
      return await this.matchingEngineService.findMatches(request, algorithm)
    } catch (error) {
      throw new HttpException(`Matching failed: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Post("profiles")
  async createProfile(body: {
    userId: string
    attributes: Record<string, any>
    preferences: Record<string, any>
  }): Promise<MatchingProfile> {
    try {
      return await this.matchingEngineService.createProfile(body.userId, body.attributes, body.preferences)
    } catch (error) {
      throw new HttpException(`Profile creation failed: ${error.message}`, HttpStatus.BAD_REQUEST)
    }
  }

  @Get('profiles/:userId')
  async getProfile(@Param('userId') userId: string): Promise<MatchingProfile> {
    const profile = await this.matchingEngineService.getProfile(userId);
    if (!profile) {
      throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
    }
    return profile;
  }

  @Put("profiles/:userId")
  async updateProfile(@Param('userId') userId: string, updates: Partial<MatchingProfile>): Promise<MatchingProfile> {
    try {
      return await this.matchingEngineService.updateProfile(userId, updates)
    } catch (error) {
      throw new HttpException(`Profile update failed: ${error.message}`, HttpStatus.BAD_REQUEST)
    }
  }

  @Get("history/:userId")
  async getMatchingHistory(@Param('userId') userId: string, @Query('limit') limit?: number) {
    return await this.matchingEngineService.getMatchingHistory(userId, limit)
  }
}
