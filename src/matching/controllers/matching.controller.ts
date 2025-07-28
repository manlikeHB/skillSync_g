import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MatchingService } from '../services/matching.service';
import { FairnessAnalyzerService } from '../services/fairness-analyzer.service';
import { FairnessConfigDto } from '../dto/matching.dto';
import { MatchingConstraints } from '../interfaces/fairness.interface';

@ApiTags('Matching')
@Controller('matching')
export class MatchingController {
  constructor(
    private matchingService: MatchingService,
    private fairnessAnalyzer: FairnessAnalyzerService,
  ) {}

  @Post('create-fair-matches')
  @ApiOperation({ summary: 'Create fair mentor-mentee matches' })
  @ApiResponse({ status: 201, description: 'Matches created successfully' })
  async createFairMatches(@Body() config: FairnessConfigDto) {
    const constraints: MatchingConstraints = {
      maxDemographicImbalance: config.maxDemographicImbalance,
      minEqualOpportunity: config.minEqualOpportunity,
      diversityWeight: config.diversityWeight,
      skillWeight: config.skillWeight,
      preferenceWeight: config.preferenceWeight,
    };

    return await this.matchingService.createFairMatches(constraints);
  }

  @Get('fairness-report')
  @ApiOperation({ summary: 'Get fairness metrics report' })
  async getFairnessReport() {
    return {
      message: 'Fairness report generated',
      timestamp: new Date(),
    };
  }
}