import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PipelineExecution } from '../entities/pipeline-execution.entity';
import { DataExtractionService } from './data-extraction.service';
import { DataTransformationService } from './data-transformation.service';
import { DataLoadingService } from './data-loading.service';
import {
  PipelineConfig,
  PipelineMetrics,
} from '../interfaces/pipeline.interface';
import { CustomLogger } from '../../logging-monitoring/services/custom-logger.service';
import { LogCategory } from '../../logging-monitoring/interfaces/log.interface';

@Injectable()
export class PipelineOrchestratorService {
  private readonly logger = new Logger(PipelineOrchestratorService.name);
  private readonly runningPipelines = new Map<string, boolean>();

  constructor(
    @InjectRepository(PipelineExecution)
    private pipelineExecutionRepository: Repository<PipelineExecution>,
    private dataExtractionService: DataExtractionService,
    private dataTransformationService: DataTransformationService,
    private dataLoadingService: DataLoadingService,
    private customLogger: CustomLogger,
  ) {
    this.customLogger.setContext(PipelineOrchestratorService.name);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async runIncrementalPipeline(): Promise<void> {
    await this.executePipeline({
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
      schedule: '0 * * * *', // Every hour
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
          executionTime: 600000, // 10 minutes
        },
      },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runFullPipeline(): Promise<void> {
    await this.executePipeline({
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
          executionTime: 1800000, // 30 minutes
        },
      },
    });
  }

  async executePipeline(config: PipelineConfig): Promise<PipelineMetrics> {
    // Prevent concurrent executions of the same pipeline
    if (this.runningPipelines.get(config.id)) {
      this.logger.warn(
        `Pipeline ${config.id} is already running, skipping execution`,
      );
      throw new Error(`Pipeline ${config.id} is already running`);
    }

    this.runningPipelines.set(config.id, true);
    const executionId = `${config.id}-${Date.now()}`;
    const startTime = new Date();

    // Create execution record
    const execution = this.pipelineExecutionRepository.create({
      pipelineId: config.id,
      status: 'running',
      config: config,
      recordsProcessed: 0,
      recordsSuccessful: 0,
      recordsFailed: 0,
      errorMessages: [],
      performance: {},
      metadata: { executionId },
    });

    await this.pipelineExecutionRepository.save(execution);

    this.customLogger.log(
      `Starting pipeline execution: ${config.name}`,
      undefined,
      {
        category: LogCategory.SYSTEM,
        action: 'pipeline_start',
        pipelineId: config.id,
        executionId,
      },
    );

    let metrics: PipelineMetrics = {
      pipelineId: config.id,
      executionId,
      startTime,
      status: 'running',
      recordsProcessed: 0,
      recordsSuccessful: 0,
      recordsFailed: 0,
      errorMessages: [],
      performance: {
        extractTime: 0,
        transformTime: 0,
        loadTime: 0,
        totalTime: 0,
      },
    };

    try {
      // Execute pipeline stages
      for (const stage of config.stages.filter((s) => s.enabled)) {
        const stageStartTime = Date.now();

        this.logger.log(`Executing stage: ${stage.name}`);

        switch (stage.type) {
          case 'extract':
            await this.executeExtractionStage(stage.config, metrics);
            metrics.performance.extractTime = Date.now() - stageStartTime;
            break;

          case 'transform':
            await this.executeTransformationStage(stage.config, metrics);
            metrics.performance.transformTime = Date.now() - stageStartTime;
            break;

          case 'load':
            await this.executeLoadingStage(stage.config, metrics);
            metrics.performance.loadTime = Date.now() - stageStartTime;
            break;

          case 'validate':
            await this.executeValidationStage(stage.config, metrics);
            break;
        }

        this.logger.log(
          `Completed stage: ${stage.name} in ${Date.now() - stageStartTime}ms`,
        );
      }

      metrics.status = 'completed';
      metrics.endTime = new Date();
      metrics.performance.totalTime =
        metrics.endTime.getTime() - startTime.getTime();

      // Update execution record
      await this.pipelineExecutionRepository.update(execution.id, {
        status: 'completed',
        recordsProcessed: metrics.recordsProcessed,
        recordsSuccessful: metrics.recordsSuccessful,
        recordsFailed: metrics.recordsFailed,
        errorMessages: metrics.errorMessages,
        performance: metrics.performance,
        endTime: metrics.endTime,
      });

      this.customLogger.log(
        `Pipeline execution completed successfully: ${config.name}`,
        undefined,
        {
          category: LogCategory.SYSTEM,
          action: 'pipeline_complete',
          pipelineId: config.id,
          executionId,
          recordsProcessed: metrics.recordsProcessed,
          executionTime: metrics.performance.totalTime,
        },
      );
    } catch (error) {
      metrics.status = 'failed';
      metrics.endTime = new Date();
      metrics.errorMessages.push(error.message);
      metrics.performance.totalTime =
        metrics.endTime.getTime() - startTime.getTime();

      // Update execution record
      await this.pipelineExecutionRepository.update(execution.id, {
        status: 'failed',
        errorMessages: metrics.errorMessages,
        performance: metrics.performance,
        endTime: metrics.endTime,
      });

      this.customLogger.error(
        `Pipeline execution failed: ${config.name}`,
        error.stack,
        PipelineOrchestratorService.name,
        {
          category: LogCategory.ERROR,
          action: 'pipeline_failed',
          pipelineId: config.id,
          executionId,
          error: error.message,
        },
      );

      // Check if retry is needed
      if (await this.shouldRetry(config, execution.id)) {
        this.logger.log(`Scheduling retry for pipeline ${config.id}`);
        setTimeout(
          () => this.executePipeline(config),
          config.retryPolicy.initialDelay,
        );
      }

      throw error;
    } finally {
      this.runningPipelines.delete(config.id);
    }

    return metrics;
  }

  private async executeExtractionStage(
    config: any,
    metrics: PipelineMetrics,
  ): Promise<void> {
    const isIncremental = config.incremental;
    const lastSync = isIncremental
      ? await this.getLastSuccessfulExecution(metrics.pipelineId)
      : undefined;

    // Extract data
    const [mentors, mentees, feedbacks, preferences, profiles] =
      await Promise.all([
        this.dataExtractionService.extractMentorData(lastSync),
        this.dataExtractionService.extractMenteeData(lastSync),
        this.dataExtractionService.extractFeedbackData([]), // Will be populated with user IDs
        this.dataExtractionService.extractPreferences(),
        this.dataExtractionService.extractMatchingProfiles([]), // Will be populated with user IDs
      ]);

    const totalRecords =
      mentors.length +
      mentees.length +
      feedbacks.length +
      preferences.length +
      profiles.length;
    metrics.recordsProcessed += totalRecords;
    metrics.recordsSuccessful += totalRecords;

    // Store extracted data in pipeline context for next stages
    (metrics as any).extractedData = {
      mentors,
      mentees,
      feedbacks,
      preferences,
      profiles,
    };
  }

  private async executeTransformationStage(
    config: any,
    metrics: PipelineMetrics,
  ): Promise<void> {
    const extractedData = (metrics as any).extractedData;

    if (!extractedData) {
      throw new Error('No extracted data available for transformation stage');
    }

    // Transform data
    const [cleanedMentors, cleanedMentees] = await Promise.all([
      this.dataTransformationService.transformMentorData(
        extractedData.mentors,
        extractedData.feedbacks,
        extractedData.profiles,
      ),
      this.dataTransformationService.transformMenteeData(
        extractedData.mentees,
        extractedData.preferences,
        extractedData.profiles,
      ),
    ]);

    // Generate feature vectors
    const featureVectors =
      await this.dataTransformationService.generateFeatureVectors(
        cleanedMentors,
        cleanedMentees,
      );

    // Store transformed data for loading stage
    (metrics as any).transformedData = {
      cleanedMentors,
      cleanedMentees,
      featureVectors,
    };

    this.logger.log(
      `Transformed ${cleanedMentors.length + cleanedMentees.length} user records into ${featureVectors.length} feature vectors`,
    );
  }

  private async executeLoadingStage(
    config: any,
    metrics: PipelineMetrics,
  ): Promise<void> {
    const transformedData = (metrics as any).transformedData;

    if (!transformedData) {
      throw new Error('No transformed data available for loading stage');
    }

    // Load data
    await Promise.all([
      this.dataLoadingService.loadFeatureVectors(
        transformedData.featureVectors,
      ),
      this.dataLoadingService.loadCleanedData(
        transformedData.cleanedMentors,
        transformedData.cleanedMentees,
      ),
    ]);

    this.logger.log(
      `Loaded ${transformedData.featureVectors.length} feature vectors to database and cache`,
    );
  }

  private async executeValidationStage(
    config: any,
    metrics: PipelineMetrics,
  ): Promise<void> {
    const transformedData = (metrics as any).transformedData;

    if (!transformedData) {
      throw new Error('No transformed data available for validation stage');
    }

    // Validate data quality
    const qualityReport = await this.dataLoadingService.validateDataQuality(
      transformedData.featureVectors,
    );

    if (qualityReport.issues.length > 0) {
      this.logger.warn(
        `Data quality issues found: ${qualityReport.issues.length} issues`,
      );
      metrics.errorMessages.push(...qualityReport.issues.slice(0, 10)); // Limit to first 10 issues
    }

    if (qualityReport.averageQuality < 50) {
      throw new Error(
        `Data quality too low: ${qualityReport.averageQuality}% average quality`,
      );
    }

    this.logger.log(
      `Data validation completed: ${qualityReport.averageQuality}% average quality`,
    );
  }

  private async getLastSuccessfulExecution(
    pipelineId: string,
  ): Promise<Date | undefined> {
    const lastExecution = await this.pipelineExecutionRepository.findOne({
      where: { pipelineId, status: 'completed' },
      order: { startTime: 'DESC' },
    });

    return lastExecution?.startTime;
  }

  private async shouldRetry(
    config: PipelineConfig,
    executionId: string,
  ): Promise<boolean> {
    const failedExecutions = await this.pipelineExecutionRepository.count({
      where: {
        pipelineId: config.id,
        status: 'failed',
        startTime: { $gte: new Date(Date.now() - 3600000) } as any, // Last hour
      },
    });

    return failedExecutions < config.retryPolicy.maxRetries;
  }

  async getPipelineMetrics(
    pipelineId: string,
    limit: number = 10,
  ): Promise<PipelineExecution[]> {
    return this.pipelineExecutionRepository.find({
      where: { pipelineId },
      order: { startTime: 'DESC' },
      take: limit,
    });
  }

  async getPipelineStatus(
    pipelineId: string,
  ): Promise<{ status: string; lastExecution?: Date; isRunning: boolean }> {
    const lastExecution = await this.pipelineExecutionRepository.findOne({
      where: { pipelineId },
      order: { startTime: 'DESC' },
    });

    return {
      status: lastExecution?.status || 'never_run',
      lastExecution: lastExecution?.startTime,
      isRunning: this.runningPipelines.get(pipelineId) || false,
    };
  }
}
