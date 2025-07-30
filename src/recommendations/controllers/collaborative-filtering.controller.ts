import { Controller, Get, Post, Query, Param, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { CollaborativeFilteringService, CollaborativeFilteringResult } from '../services/collaborative-filtering.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../user/enums/user-role.enum';

export interface CollaborativeFilteringRequestDto {
  userId: string;
  userType: 'mentor' | 'mentee';
  limit?: number;
  algorithm?: 'user-based' | 'item-based' | 'hybrid';
}

export class CollaborativeFilteringResponseDto {
  recommendations: CollaborativeFilteringResult[];
  totalProcessed: number;
  executionTime: number;
  algorithm: string;
  metadata: {
    totalUsers: number;
    totalMatches: number;
    totalFeedback: number;
    averageRating: number;
    cacheSize: number;
  };
}

@ApiTags('Collaborative Filtering')
@Controller('collaborative-filtering')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CollaborativeFilteringController {
  private readonly logger = new Logger(CollaborativeFilteringController.name);

  constructor(
    private readonly collaborativeFilteringService: CollaborativeFilteringService,
  ) {}

  @Get('recommendations/:userId')
  @Roles(UserRole.MENTOR, UserRole.MENTEE)
  @ApiOperation({ summary: 'Get collaborative filtering recommendations for a user' })
  @ApiParam({ name: 'userId', description: 'User ID to get recommendations for' })
  @ApiQuery({ name: 'userType', enum: ['mentor', 'mentee'], description: 'Type of user' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of recommendations to return (default: 10)' })
  @ApiQuery({ 
    name: 'algorithm', 
    enum: ['user-based', 'item-based', 'hybrid'], 
    required: false, 
    description: 'Collaborative filtering algorithm to use (default: hybrid)' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Recommendations generated successfully',
    type: CollaborativeFilteringResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getRecommendations(
    @Param('userId') userId: string,
    @Query('userType') userType: 'mentor' | 'mentee',
    @Query('limit') limit: number = 10,
    @Query('algorithm') algorithm: 'user-based' | 'item-based' | 'hybrid' = 'hybrid'
  ): Promise<CollaborativeFilteringResponseDto> {
    this.logger.log(`Generating ${algorithm} recommendations for user ${userId}`);

    const startTime = Date.now();

    try {
      const recommendations = await this.collaborativeFilteringService.generateRecommendations(
        userId,
        userType,
        limit,
        algorithm
      );

      const stats = await this.collaborativeFilteringService.getAlgorithmStats();
      const executionTime = Date.now() - startTime;

      this.logger.log(`Generated ${recommendations.length} recommendations in ${executionTime}ms`);

      return {
        recommendations,
        totalProcessed: recommendations.length,
        executionTime,
        algorithm,
        metadata: stats
      };
    } catch (error) {
      this.logger.error(`Error generating recommendations: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('recommendations/batch')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Generate recommendations for multiple users (admin only)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Batch recommendations generated successfully',
    type: CollaborativeFilteringResponseDto
  })
  async generateBatchRecommendations(
    @Query() request: CollaborativeFilteringRequestDto
  ): Promise<CollaborativeFilteringResponseDto> {
    this.logger.log(`Generating batch recommendations for user ${request.userId}`);

    const startTime = Date.now();

    try {
      const recommendations = await this.collaborativeFilteringService.generateRecommendations(
        request.userId,
        request.userType,
        request.limit || 10,
        request.algorithm || 'hybrid'
      );

      const stats = await this.collaborativeFilteringService.getAlgorithmStats();
      const executionTime = Date.now() - startTime;

      this.logger.log(`Generated ${recommendations.length} batch recommendations in ${executionTime}ms`);

      return {
        recommendations,
        totalProcessed: recommendations.length,
        executionTime,
        algorithm: request.algorithm || 'hybrid',
        metadata: stats
      };
    } catch (error) {
      this.logger.error(`Error generating batch recommendations: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get collaborative filtering algorithm statistics (admin only)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Algorithm statistics retrieved successfully'
  })
  async getAlgorithmStats() {
    this.logger.log('Retrieving collaborative filtering algorithm statistics');
    
    try {
      const stats = await this.collaborativeFilteringService.getAlgorithmStats();
      
      this.logger.log(`Retrieved stats: ${stats.totalUsers} users, ${stats.totalMatches} matches, ${stats.totalFeedback} feedback`);
      
      return {
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error retrieving algorithm stats: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('cache/clear')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Clear collaborative filtering cache (admin only)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Cache cleared successfully'
  })
  async clearCache() {
    this.logger.log('Clearing collaborative filtering cache');
    
    try {
      this.collaborativeFilteringService.clearCache();
      
      this.logger.log('Collaborative filtering cache cleared successfully');
      
      return {
        success: true,
        message: 'Cache cleared successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error clearing cache: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Check collaborative filtering service health' })
  @ApiResponse({ 
    status: 200, 
    description: 'Service is healthy'
  })
  async healthCheck() {
    this.logger.log('Performing collaborative filtering health check');
    
    try {
      const stats = await this.collaborativeFilteringService.getAlgorithmStats();
      
      const isHealthy = stats.totalUsers > 0 && stats.totalMatches > 0;
      
      return {
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        data: {
          totalUsers: stats.totalUsers,
          totalMatches: stats.totalMatches,
          totalFeedback: stats.totalFeedback,
          averageRating: stats.averageRating,
          cacheSize: stats.cacheSize
        }
      };
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`, error.stack);
      
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
} 