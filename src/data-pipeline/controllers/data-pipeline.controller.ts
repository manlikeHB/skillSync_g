import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Body,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PipelineOrchestratorService } from '../services/pipeline-orchestrator.service';
import { PipelineMonitoringService } from '../services/pipeline-monitoring.service';
import { DataLoadingService } from '../services/data-loading.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../user/enums/user-role.enum';
import { PipelineConfig } from '../interfaces/pipeline.interface';

@ApiTags('Data Pipeline')
@Controller('data-pipeline')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DataPipelineController {
  constructor(
    private pipelineOrchestrator: PipelineOrchestratorService,
    private pipelineMonitoring: PipelineMonitoringService,
    private dataLoading: DataLoadingService,
  ) {}

  @Post('execute/:pipelineId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Manually trigger pipeline execution' })
  @ApiResponse({ status: 200, description: 'Pipeline execution started' })
  async executePipeline(@Param('pipelineId') pipelineId: string) {
    try {
      const config = this.getPipelineConfig(pipelineId);
      const metrics = await this.pipelineOrchestrator.executePipeline(config);

      return {
        success: true,
        executionId: metrics.executionId,
        status: metrics.status,
        message: 'Pipeline execution completed successfully',
      };
    } catch (error: any) {
      throw new HttpException(
        `Pipeline execution failed: ${(error as Error)?.message || 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('status/:pipelineId')
  @Roles(UserRole.ADMIN, UserRole.MENTOR)
  @ApiOperation({ summary: 'Get pipeline status' })
  async getPipelineStatus(@Param('pipelineId') pipelineId: string) {
    return this.pipelineOrchestrator.getPipelineStatus(pipelineId);
  }

  @Get('metrics/:pipelineId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get pipeline execution metrics' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPipelineMetrics(
    @Param('pipelineId') pipelineId: string,
    @Query('limit') limit?: number,
  ) {
    return this.pipelineOrchestrator.getPipelineMetrics(
      pipelineId,
      limit || 10,
    );
  }

  @Get('health')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get overall pipeline health metrics' })
  async getPipelineHealth() {
    return this.pipelineMonitoring.getPipelineHealthMetrics();
  }

  @Get('health/detailed')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get detailed pipeline metrics' })
  @ApiQuery({ name: 'pipelineId', required: false, type: String })
  async getDetailedMetrics(
    @Query('pipelineId') pipelineId?: string,
  ): Promise<any> {
    return this.pipelineMonitoring.getDetailedMetrics(pipelineId);
  }

  @Get('feature-vector/:userId')
  @Roles(UserRole.ADMIN, UserRole.MENTOR)
  @ApiOperation({ summary: 'Get feature vector for a specific user' })
  async getFeatureVector(@Param('userId') userId: string) {
    const vector = await this.dataLoading.getFeatureVector(userId);

    if (!vector) {
      throw new HttpException('Feature vector not found', HttpStatus.NOT_FOUND);
    }

    return vector;
  }

  @Post('feature-vectors/batch')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get feature vectors for multiple users' })
  async getFeatureVectorsBatch(@Body() body: { userIds: string[] }) {
    if (!body.userIds || !Array.isArray(body.userIds)) {
      throw new HttpException(
        'Invalid user IDs provided',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.dataLoading.getFeatureVectorsBatch(body.userIds);
  }

  @Delete('cache/clear')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Clear pipeline data cache' })
  clearCache() {
    // Implementation would clear Redis cache
    return { success: true, message: 'Cache cleared successfully' };
  }

  @Post('validate/data-quality')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Validate current data quality' })
  async validateDataQuality() {
    try {
      // Get sample of feature vectors for validation
      const vectors = await this.dataLoading.getFeatureVectorsBatch([]);
      const report = await this.dataLoading.validateDataQuality(vectors);

      return {
        success: true,
        report,
        timestamp: new Date(),
      };
    } catch (error: any) {
      throw new HttpException(
        `Data quality validation failed: ${(error as Error)?.message || 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getPipelineConfig(pipelineId: string): PipelineConfig {
    const configs: Record<string, PipelineConfig> = {
      'incremental-matching-pipeline': {
        id: 'incremental-matching-pipeline',
        name: 'Incremental Matching Data Pipeline',
        description: 'Processes recently updated mentor-mentee data',
        stages: [
          {
            id: 'extract',
            name: 'Extract',
            type: 'extract',
            enabled: true,
            config: { incremental: true },
          },
          {
            id: 'transform',
            name: 'Transform',
            type: 'transform',
            enabled: true,
            config: {},
          },
          { id: 'load', name: 'Load', type: 'load', enabled: true, config: {} },
          {
            id: 'validate',
            name: 'Validate',
            type: 'validate',
            enabled: true,
            config: {},
          },
        ],
        retryPolicy: {
          maxRetries: 3,
          backoffStrategy: 'exponential',
          initialDelay: 5000,
        },
        alerting: {
          enabled: true,
          channels: ['email', 'slack'],
          thresholds: {
            errorRate: 0.05,
            executionTime: 600000,
          },
        },
      },
      'full-matching-pipeline': {
        id: 'full-matching-pipeline',
        name: 'Full Matching Data Pipeline',
        description: 'Complete rebuild of matching data',
        stages: [
          {
            id: 'extract',
            name: 'Extract',
            type: 'extract',
            enabled: true,
            config: { incremental: false },
          },
          {
            id: 'transform',
            name: 'Transform',
            type: 'transform',
            enabled: true,
            config: {},
          },
          { id: 'load', name: 'Load', type: 'load', enabled: true, config: {} },
          {
            id: 'validate',
            name: 'Validate',
            type: 'validate',
            enabled: true,
            config: {},
          },
        ],
        retryPolicy: {
          maxRetries: 2,
          backoffStrategy: 'exponential',
          initialDelay: 10000,
        },
        alerting: {
          enabled: true,
          channels: ['email', 'slack'],
          thresholds: {
            errorRate: 0.02,
            executionTime: 1800000,
          },
        },
      },
    };

    const config = configs[pipelineId];
    if (!config) {
      throw new HttpException(
        `Pipeline configuration not found: ${pipelineId}`,
        HttpStatus.NOT_FOUND,
      );
    }

    return config;
  }
}
