import { WorkflowType } from '../enums/workflow-type.enum';
import { WorkflowStatus } from '../enums/workflow-status.enum';

export interface DataProcessingRequest {
  workflowType: WorkflowType;
  configuration: {
    batchSize: number;
    timeout: number;
    retryAttempts: number;
    algorithm: string;
    parameters: Record<string, any>;
  };
  inputData: {
    dataCollectionIds: string[];
    filters: Record<string, any>;
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
}

export interface DataProcessingResponse {
  workflowId: string;
  status: WorkflowStatus;
  progress: {
    currentStep: string;
    completedSteps: string[];
    totalSteps: number;
    currentStepIndex: number;
    percentage: number;
  };
  results?: {
    processedRecords: number;
    validRecords: number;
    invalidRecords: number;
    anonymizedRecords: number;
    dataQuality: number;
    privacyMetrics: Record<string, number>;
  };
  error?: string;
}