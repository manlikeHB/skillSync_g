import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { WorkflowStatus } from '../enums/workflow-status.enum';
import { WorkflowType } from '../enums/workflow-type.enum';

@Entity('data_workflows')
@Index(['workflowType', 'status'])
@Index(['createdAt'])
export class DataWorkflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: WorkflowType })
  workflowType: WorkflowType;

  @Column({ type: 'enum', enum: WorkflowStatus, default: WorkflowStatus.PENDING })
  status: WorkflowStatus;

  @Column({ type: 'jsonb' })
  configuration: {
    batchSize: number;
    timeout: number;
    retryAttempts: number;
    algorithm: string;
    parameters: Record<string, any>;
  };

  @Column({ type: 'jsonb', nullable: true })
  inputData: {
    dataCollectionIds: string[];
    filters: Record<string, any>;
    dateRange: {
      start: Date;
      end: Date;
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  outputData: {
    processedRecords: number;
    validRecords: number;
    invalidRecords: number;
    anonymizedRecords: number;
    results: Record<string, any>;
  };

  @Column({ type: 'jsonb', nullable: true })
  executionMetrics: {
    startTime: Date;
    endTime: Date;
    duration: number;
    memoryUsage: number;
    cpuUsage: number;
    errorCount: number;
    warningCount: number;
  };

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  progress: {
    currentStep: string;
    completedSteps: string[];
    totalSteps: number;
    currentStepIndex: number;
    percentage: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  logs: {
    level: string;
    message: string;
    timestamp: Date;
    metadata: Record<string, any>;
  }[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 