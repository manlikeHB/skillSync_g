import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { RecommendationService } from '../services/recommendation.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get()
  async getRecommendations(
    @Req() req,
    @Query('limit') limit: string = '10'
  ) {
    return this.recommendationService.generateRecommendations(
      req.user.id, 
      parseInt(limit, 10)
    );
  }
}