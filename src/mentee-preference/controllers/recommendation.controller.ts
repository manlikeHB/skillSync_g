import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { RecommendationService } from '../services/recommendation.service';
import { RecommendationRequestDto, RecommendationResponseDto } from '../dto/recommendation.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get('mentors')
  async getMentorRecommendations(
    @Request() req,
    @Query() dto: RecommendationRequestDto
  ): Promise<RecommendationResponseDto[]> {
    return this.recommendationService.getRecommendations(req.user.id, dto);
  }
}