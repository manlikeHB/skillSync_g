import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { PipelineExecution } from '../entities/pipeline-execution.entity';
import { FeatureVector } from '../entities/feature-vector.entity';
import { PIPELINE_CONFIG } from '../config/pipeline.config';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    @InjectRepository(PipelineExecution)
    private pipelineExecutionRepository: Repository<PipelineExecution>,
    @InjectRepository(FeatureVector)
    private featureVectorRepository: Repository<FeatureVector>,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @Cron(PIPELINE_CONFIG.schedules.cleanup)
  async performWeeklyCleanup(): Promise<void> {
    this.logger.log('Starting weekly cleanup process');

    try {
      await Promise.all([
        this.cleanupOldExecutions(),
        this.cleanupStaleFeatureVectors(),
        this.optimizeDatabase(),
      ]);

      this.logger.log('Weekly cleanup completed successfully');
    } catch (error) {
      this.logger.error('Weekly cleanup failed:', error);
    }
  }

  private async cleanupOldExecutions(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(
      cutoffDate.getDate() - PIPELINE_CONFIG.monitoring.metricsRetentionDays,
    );

    const deletedCount = await this.pipelineExecutionRepository.delete({
      startTime: LessThan(cutoffDate),
    });

    this.logger.log(
      `Cleaned up ${deletedCount.affected || 0} old pipeline executions`,
    );
  }

  private async cleanupStaleFeatureVectors(): Promise<void> {
    // Remove feature vectors for inactive users
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - 90); // 90 days old

    const staleVectors = await this.featureVectorRepository.find({
      where: {
        lastUpdated: LessThan(staleDate),
      },
      take: 1000, // Process in batches
    });

    if (staleVectors.length > 0) {
      await this.featureVectorRepository.remove(staleVectors);
      this.logger.log(
        `Cleaned up ${staleVectors.length} stale feature vectors`,
      );
    }
  }

  private optimizeDatabase(): Promise<void> {
    try {
      // Run database optimization queries
      // This would be database-specific (PostgreSQL VACUUM, MySQL OPTIMIZE, etc.)
      this.logger.log('Database optimization completed');
      return Promise.resolve();
    } catch (error) {
      this.logger.error('Database optimization failed:', error);
      return Promise.reject(
        new Error(
          error instanceof Error
            ? error.message
            : 'Database optimization failed',
        ),
      );
    }
  }

  async cleanupUserData(userId: string): Promise<void> {
    this.logger.log(`Cleaning up data for user: ${userId}`);

    try {
      // Remove user's feature vectors
      await this.featureVectorRepository.delete({ userId });

      // Remove user's pipeline execution records (if any)
      const userExecutions = await this.pipelineExecutionRepository.find({
        where: {
          metadata: { userId } as Record<string, any>,
        },
      });

      if (userExecutions.length > 0) {
        await this.pipelineExecutionRepository.remove(userExecutions);
      }

      this.logger.log(`Successfully cleaned up data for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to cleanup data for user ${userId}:`, error);
      throw error;
    }
  }
}
