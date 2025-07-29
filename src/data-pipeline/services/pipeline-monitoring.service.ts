/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PipelineExecution } from '../entities/pipeline-execution.entity';
import { FeatureVector } from '../entities/feature-vector.entity';
import { CustomLogger } from 'src/logging/services/custom-logger.service';
import { LogCategory } from 'src/logging/interfaces/log.interface';

export interface PipelineHealthMetrics {
  totalPipelines: number;
  activePipelines: number;
  failedPipelines: number;
  avgExecutionTime: number;
  successRate: number;
  lastExecution: Date | null;
  dataFreshness: {
    featureVectors: {
      total: number;
      stale: number; // older than 24 hours
      avgAge: number;
    };
    avgQualityScore: number;
  };
  resourceUsage: {
    databaseSize: number;
    cacheHitRate: number;
    processingBacklog: number;
  };
  alerts: {
    level: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: Date;
  }[];
}

@Injectable()
export class PipelineMonitoringService {
  private readonly logger = new Logger(PipelineMonitoringService.name);
  private readonly alertThresholds = {
    maxFailureRate: 0.1, // 10%
    maxExecutionTime: 1800000, // 30 minutes
    maxDataAge: 86400000, // 24 hours
    minQualityScore: 60,
  };

  constructor(
    @InjectRepository(PipelineExecution)
    private pipelineExecutionRepository: Repository<PipelineExecution>,
    @InjectRepository(FeatureVector)
    private featureVectorRepository: Repository<FeatureVector>,
    private customLogger: CustomLogger,
  ) {
    this.customLogger.setContext(PipelineMonitoringService.name);
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async monitorPipelineHealth(): Promise<void> {
    try {
      const metrics = await this.getPipelineHealthMetrics();

      // Check for critical issues
      this.checkHealthAlerts(metrics);

      // Log health metrics
      this.customLogger.log('Pipeline health check completed', undefined, {
        category: LogCategory.SYSTEM,
        action: 'health_check',
        metrics: {
          successRate: metrics.successRate,
          avgExecutionTime: metrics.avgExecutionTime,
          dataFreshness: metrics.dataFreshness.featureVectors.avgAge,
          qualityScore: metrics.dataFreshness.avgQualityScore,
        },
      });
    } catch (error: any) {
      this.logger.error('Pipeline health monitoring failed:', error);
      this.customLogger.error(
        'Pipeline health monitoring failed',
        (error as Error)?.stack,
        PipelineMonitoringService.name,
        {
          category: LogCategory.ERROR,
          action: 'health_check_failed',
          error: (error as Error)?.message,
        },
      );
    }
  }

  async getPipelineHealthMetrics(): Promise<PipelineHealthMetrics> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get pipeline execution metrics
    const [
      recentExecutions,
      weeklyExecutions,
      featureVectorStats,
      lastExecution,
    ] = await Promise.all([
      this.pipelineExecutionRepository.find({
        where: { startTime: { $gte: last24Hours } as any },
        order: { startTime: 'DESC' },
      }),
      this.pipelineExecutionRepository.find({
        where: { startTime: { $gte: last7Days } as any },
      }),
      this.getFeatureVectorStats(),
      this.pipelineExecutionRepository.findOne({
        order: { startTime: 'DESC' },
      }),
    ]);

    // Calculate metrics
    const totalExecutions = weeklyExecutions.length;
    const successfulExecutions = weeklyExecutions.filter(
      (e) => e.status === 'completed',
    ).length;
    const failedExecutions = weeklyExecutions.filter(
      (e) => e.status === 'failed',
    ).length;
    const activePipelines = recentExecutions.filter(
      (e) => e.status === 'running',
    ).length;

    const successRate =
      totalExecutions > 0 ? successfulExecutions / totalExecutions : 0;

    const completedExecutions = weeklyExecutions.filter(
      (e) => e.status === 'completed' && e.performance?.totalTime,
    );
    const avgExecutionTime =
      completedExecutions.length > 0
        ? completedExecutions.reduce(
            (sum, e) => sum + (e.performance?.totalTime || 0),
            0,
          ) / completedExecutions.length
        : 0;

    // Generate alerts
    const alerts = this.generateAlerts({
      successRate,
      avgExecutionTime,
      featureVectorStats,
      recentExecutions,
    });

    return {
      totalPipelines: totalExecutions,
      activePipelines,
      failedPipelines: failedExecutions,
      avgExecutionTime,
      successRate,
      lastExecution: lastExecution?.startTime || null,
      dataFreshness: {
        featureVectors: featureVectorStats,
        avgQualityScore: featureVectorStats.avgQualityScore,
      },
      resourceUsage: {
        databaseSize: await this.getDatabaseSize(),
        cacheHitRate: 0.95, // Placeholder - implement cache metrics
        processingBacklog: activePipelines,
      },
      alerts,
    };
  }

  private async getFeatureVectorStats(): Promise<{
    total: number;
    stale: number;
    avgAge: number;
    avgQualityScore: number;
  }> {
    const now = new Date();
    const staleThreshold = new Date(
      now.getTime() - this.alertThresholds.maxDataAge,
    );

    const [total, staleCount, vectors] = await Promise.all([
      this.featureVectorRepository.count(),
      this.featureVectorRepository.count({
        where: { lastUpdated: { $lt: staleThreshold } as any },
      }),
      this.featureVectorRepository.find({
        select: ['lastUpdated', 'qualityScore'],
        take: 1000, // Sample for performance
      }),
    ]);

    let totalAge = 0;
    let totalQualityScore = 0;

    vectors.forEach((vector) => {
      const age = now.getTime() - vector.lastUpdated.getTime();
      totalAge += age;
      totalQualityScore += vector.qualityScore;
    });

    const avgAge = vectors.length > 0 ? totalAge / vectors.length : 0;
    const avgQualityScore =
      vectors.length > 0 ? totalQualityScore / vectors.length : 0;

    return {
      total,
      stale: staleCount,
      avgAge,
      avgQualityScore,
    };
  }

  private generateAlerts(metrics: {
    successRate: number;
    avgExecutionTime: number;
    featureVectorStats: any;
    recentExecutions: any[];
  }): {
    level: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: Date;
  }[] {
    const alerts: {
      level: 'info' | 'warning' | 'critical';
      message: string;
      timestamp: Date;
    }[] = [];
    const now = new Date();

    // Check failure rate
    if (metrics.successRate < this.alertThresholds.maxFailureRate) {
      alerts.push({
        level: 'critical' as const,
        message: `High pipeline failure rate: ${(metrics.successRate * 100).toFixed(1)}%`,
        timestamp: now,
      });
    }

    // Check execution time
    if (metrics.avgExecutionTime > this.alertThresholds.maxExecutionTime) {
      alerts.push({
        level: 'warning' as const,
        message: `High average execution time: ${(metrics.avgExecutionTime / 1000 / 60).toFixed(1)} minutes`,
        timestamp: now,
      });
    }

    // Check data freshness
    if (
      (metrics.featureVectorStats as any).avgAge >
      this.alertThresholds.maxDataAge
    ) {
      alerts.push({
        level: 'warning' as const,
        message: `Stale data detected: ${((metrics.featureVectorStats as any).avgAge / 1000 / 60 / 60).toFixed(1)} hours old on average`,
        timestamp: now,
      });
    }

    // Check data quality
    if (
      (metrics.featureVectorStats as any).avgQualityScore <
      this.alertThresholds.minQualityScore
    ) {
      alerts.push({
        level: 'critical' as const,
        message: `Low data quality: ${(metrics.featureVectorStats as any).avgQualityScore.toFixed(1)}% average quality score`,
        timestamp: now,
      });
    }

    // Check for stuck pipelines
    const stuckPipelines = metrics.recentExecutions.filter(
      (e: any) =>
        (e as any).status === 'running' &&
        now.getTime() - new Date((e as any).startTime).getTime() >
          this.alertThresholds.maxExecutionTime,
    );

    if (stuckPipelines.length > 0) {
      alerts.push({
        level: 'critical' as const,
        message: `${stuckPipelines.length} pipeline(s) appear to be stuck`,
        timestamp: now,
      });
    }

    return alerts;
  }

  private checkHealthAlerts(metrics: PipelineHealthMetrics): void {
    const criticalAlerts = metrics.alerts.filter((a) => a.level === 'critical');
    const warningAlerts = metrics.alerts.filter((a) => a.level === 'warning');

    if (criticalAlerts.length > 0) {
      this.customLogger.error(
        `Critical pipeline alerts: ${criticalAlerts.map((a) => a.message).join(', ')}`,
        undefined,
        PipelineMonitoringService.name,
        {
          category: LogCategory.ERROR,
          action: 'critical_alert',
          alerts: criticalAlerts,
        },
      );
    }

    if (warningAlerts.length > 0) {
      this.customLogger.warn(
        `Pipeline warnings: ${warningAlerts.map((a) => a.message).join(', ')}`,
        undefined,
        {
          category: LogCategory.SYSTEM,
          action: 'warning_alert',
          alerts: warningAlerts,
        },
      );
    }
  }

  private getDatabaseSize(): Promise<number> {
    try {
      // This would need to be implemented based on your database type
      // For PostgreSQL, you could use pg_database_size
      // For now, returning a placeholder
      return Promise.resolve(0);
    } catch (error) {
      this.logger.error('Failed to get database size:', error);
      return Promise.resolve(0);
    }
  }

  async getDetailedMetrics(pipelineId?: string): Promise<any> {
    const baseQuery =
      this.pipelineExecutionRepository.createQueryBuilder('execution');

    if (pipelineId) {
      baseQuery.where('execution.pipelineId = :pipelineId', { pipelineId });
    }

    const executions = await baseQuery
      .orderBy('execution.startTime', 'DESC')
      .take(100)
      .getMany();

    // Calculate detailed metrics
    const metrics = {
      totalExecutions: executions.length,
      successRate:
        executions.filter((e) => e.status === 'completed').length /
        executions.length,
      averageExecutionTime: this.calculateAverageExecutionTime(executions),
      executionTrends: this.calculateExecutionTrends(executions),
      errorPatterns: this.analyzeErrorPatterns(executions),
      performanceMetrics: this.calculatePerformanceMetrics(executions),
    };

    return metrics;
  }

  private calculateAverageExecutionTime(
    executions: PipelineExecution[],
  ): number {
    const completed = executions.filter(
      (e) => e.status === 'completed' && e.performance?.totalTime,
    );
    if (completed.length === 0) return 0;

    return (
      completed.reduce((sum, e) => sum + (e.performance?.totalTime || 0), 0) /
      completed.length
    );
  }

  private calculateExecutionTrends(executions: PipelineExecution[]): any[] {
    const trends: any[] = [];
    const now = new Date();

    for (let i = 0; i < 24; i++) {
      const hourStart = new Date(now.getTime() - (i + 1) * 60 * 60 * 1000);
      const hourEnd = new Date(now.getTime() - i * 60 * 60 * 1000);

      const hourExecutions = executions.filter(
        (e) => e.startTime >= hourStart && e.startTime < hourEnd,
      );

      trends.unshift({
        hour: hourStart.getHours(),
        total: hourExecutions.length,
        successful: hourExecutions.filter((e) => e.status === 'completed')
          .length,
        failed: hourExecutions.filter((e) => e.status === 'failed').length,
        avgTime: this.calculateAverageExecutionTime(hourExecutions),
      });
    }

    return trends;
  }

  private analyzeErrorPatterns(executions: PipelineExecution[]): any {
    const failedExecutions = executions.filter((e) => e.status === 'failed');
    const errorCounts = new Map<string, number>();

    failedExecutions.forEach((execution) => {
      execution.errorMessages?.forEach((error) => {
        // Extract error type from message
        const errorType = this.extractErrorType(error);
        errorCounts.set(errorType, (errorCounts.get(errorType) || 0) + 1);
      });
    });

    return Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([error, count]) => ({ error, count }));
  }

  private extractErrorType(errorMessage: string): string {
    // Simple error classification - can be enhanced
    if (errorMessage.includes('timeout')) return 'Timeout Error';
    if (errorMessage.includes('connection')) return 'Connection Error';
    if (errorMessage.includes('memory')) return 'Memory Error';
    if (errorMessage.includes('validation')) return 'Validation Error';
    if (errorMessage.includes('transform')) return 'Transformation Error';
    return 'Unknown Error';
  }

  private calculatePerformanceMetrics(executions: PipelineExecution[]): any {
    const completed = executions.filter(
      (e) => e.status === 'completed' && e.performance,
    );

    if (completed.length === 0) {
      return {
        avgExtractTime: 0,
        avgTransformTime: 0,
        avgLoadTime: 0,
        recordsPerSecond: 0,
      };
    }

    const totalExtractTime = completed.reduce(
      (sum, e) => sum + (e.performance?.extractTime || 0),
      0,
    );
    const totalTransformTime = completed.reduce(
      (sum, e) => sum + (e.performance?.transformTime || 0),
      0,
    );
    const totalLoadTime = completed.reduce(
      (sum, e) => sum + (e.performance?.loadTime || 0),
      0,
    );
    const totalRecords = completed.reduce(
      (sum, e) => sum + e.recordsProcessed,
      0,
    );
    const totalTime = completed.reduce(
      (sum, e) => sum + (e.performance?.totalTime || 0),
      0,
    );

    return {
      avgExtractTime: totalExtractTime / completed.length,
      avgTransformTime: totalTransformTime / completed.length,
      avgLoadTime: totalLoadTime / completed.length,
      recordsPerSecond: totalTime > 0 ? (totalRecords / totalTime) * 1000 : 0,
    };
  }
}
