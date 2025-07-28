import { Controller, Post, Get, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RecommendationService } from '../services/recommendation.service';
import { RecommendationRequestDto } from '../dto/recommendation-request.dto';
import { RecommendationsListDto } from '../dto/recommendation-response.dto';

@ApiTags('recommendations')
@Controller('recommendations')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate mentor/mentee recommendations with explanations' })
  @ApiResponse({ status: 200, description: 'Recommendations generated successfully', type: RecommendationsListDto })
  async generateRecommendations(
    @Body() request: RecommendationRequestDto
  ): Promise<RecommendationsListDto> {
    try {
      return await this.recommendationService.generateRecommendations(request);
    } catch (error) {
      throw new HttpException(
        `Failed to generate recommendations: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id/explanation')
  @ApiOperation({ summary: 'Get detailed explanation for a specific recommendation' })
  async getRecommendationExplanation(@Param('id') recommendationId: string) {
    try {
      return await this.recommendationService.getRecommendationExplanation(recommendationId);
    } catch (error) {
      throw new HttpException(
        `Failed to get recommendation explanation: ${error.message}`,
        HttpStatus.NOT_FOUND
      );
    }
  }

  @Post(':id/feedback')
  @ApiOperation({ summary: 'Provide feedback on a recommendation' })
  async provideFeedback(
    @Param('id') recommendationId: string,
    @Body('feedback') feedback: string
  ) {
    try {
      await this.recommendationService.provideFeedback(recommendationId, feedback);
      return { message: 'Feedback recorded successfully' };
    } catch (error) {
      throw new HttpException(
        `Failed to record feedback: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}