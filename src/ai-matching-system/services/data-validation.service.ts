import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DataValidationRule, DataValidationResult } from '../interfaces/data-validation-rule.interface';
import { DataQualityMetrics } from '../interfaces/data-quality-metrics.interface';
import { DataType } from '../enums/data-type.enum';

@Injectable()
export class DataValidationService {
  private readonly logger = new Logger(DataValidationService.name);

  private readonly defaultValidationRules: Map<DataType, DataValidationRule[]> = new Map([
    [DataType.MENTOR_PROFILE, [
      { field: 'name', type: 'required', message: 'Name is required', severity: 'error' },
      { field: 'email', type: 'email', message: 'Valid email is required', severity: 'error' },
      { field: 'skills', type: 'required', message: 'Skills are required', severity: 'error' },
      { field: 'experienceYears', type: 'custom', value: (val: any) => val >= 0 && val <= 50, message: 'Experience years must be between 0 and 50', severity: 'error' },
      { field: 'bio', type: 'maxLength', value: 1000, message: 'Bio must be less than 1000 characters', severity: 'warning' }
    ]],
    [DataType.MENTEE_PROFILE, [
      { field: 'name', type: 'required', message: 'Name is required', severity: 'error' },
      { field: 'email', type: 'email', message: 'Valid email is required', severity: 'error' },
      { field: 'learningGoals', type: 'required', message: 'Learning goals are required', severity: 'error' },
      { field: 'experienceLevel', type: 'required', message: 'Experience level is required', severity: 'error' }
    ]],
    [DataType.PREFERENCE, [
      { field: 'mentorId', type: 'required', message: 'Mentor ID is required', severity: 'error' },
      { field: 'menteeId', type: 'required', message: 'Mentee ID is required', severity: 'error' },
      { field: 'preferenceType', type: 'required', message: 'Preference type is required', severity: 'error' },
      { field: 'weight', type: 'custom', value: (val: any) => val >= 1 && val <= 10, message: 'Weight must be between 1 and 10', severity: 'error' }
    ]],
    [DataType.INTERACTION, [
      { field: 'mentorId', type: 'required', message: 'Mentor ID is required', severity: 'error' },
      { field: 'menteeId', type: 'required', message: 'Mentee ID is required', severity: 'error' },
      { field: 'sessionDate', type: 'required', message: 'Session date is required', severity: 'error' },
      { field: 'duration', type: 'custom', value: (val: any) => val > 0, message: 'Duration must be positive', severity: 'error' }
    ]],
    [DataType.FEEDBACK, [
      { field: 'mentorId', type: 'required', message: 'Mentor ID is required', severity: 'error' },
      { field: 'menteeId', type: 'required', message: 'Mentee ID is required', severity: 'error' },
      { field: 'rating', type: 'custom', value: (val: any) => val >= 1 && val <= 5, message: 'Rating must be between 1 and 5', severity: 'error' },
      { field: 'comment', type: 'maxLength', value: 2000, message: 'Comment must be less than 2000 characters', severity: 'warning' }
    ]]
  ]);

  async validateData(
    data: Record<string, any>,
    dataType: DataType,
    customRules?: DataValidationRule[]
  ): Promise<DataValidationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const rulesApplied: DataValidationRule[] = [];

    try {
      this.logger.log(`Starting validation for data type: ${dataType}`);

      // Get default rules for this data type
      const defaultRules = this.defaultValidationRules.get(dataType) || [];
      const allRules = [...defaultRules, ...(customRules || [])];

      // Apply validation rules
      for (const rule of allRules) {
        rulesApplied.push(rule);
        const validationResult = this.applyValidationRule(data, rule);
        
        if (!validationResult.isValid) {
          if (rule.severity === 'error') {
            errors.push(validationResult.message);
          } else {
            warnings.push(validationResult.message);
          }
        }
      }

      // Calculate data quality metrics
      const qualityMetrics = this.calculateDataQuality(data, dataType);
      const dataQuality = qualityMetrics.overallScore;

      const validationTime = Date.now() - startTime;
      const isValid = errors.length === 0;

      this.logger.log(`Validation completed for ${dataType}. Valid: ${isValid}, Errors: ${errors.length}, Warnings: ${warnings.length}`);

      return {
        isValid,
        errors,
        warnings,
        dataQuality,
        validationTime,
        rulesApplied
      };

    } catch (error) {
      this.logger.error(`Validation failed for ${dataType}: ${error.message}`, error.stack);
      throw new BadRequestException(`Data validation failed: ${error.message}`);
    }
  }

  private applyValidationRule(data: Record<string, any>, rule: DataValidationRule): { isValid: boolean; message: string } {
    const value = this.getNestedValue(data, rule.field);

    switch (rule.type) {
      case 'required':
        return {
          isValid: value !== undefined && value !== null && value !== '',
          message: rule.message
        };

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return {
          isValid: typeof value === 'string' && emailRegex.test(value),
          message: rule.message
        };

      case 'minLength':
        return {
          isValid: typeof value === 'string' && value.length >= (rule.value as number),
          message: rule.message
        };

      case 'maxLength':
        return {
          isValid: typeof value === 'string' && value.length <= (rule.value as number),
          message: rule.message
        };

      case 'pattern':
        const regex = new RegExp(rule.value as string);
        return {
          isValid: typeof value === 'string' && regex.test(value),
          message: rule.message
        };

      case 'custom':
        const customValidator = rule.value as (val: any) => boolean;
        return {
          isValid: customValidator(value),
          message: rule.message
        };

      default:
        return {
          isValid: true,
          message: 'Unknown validation rule type'
        };
    }
  }

  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private calculateDataQuality(data: Record<string, any>, dataType: DataType): DataQualityMetrics {
    const metrics: DataQualityMetrics = {
      completeness: this.calculateCompleteness(data, dataType),
      accuracy: this.calculateAccuracy(data, dataType),
      consistency: this.calculateConsistency(data, dataType),
      timeliness: this.calculateTimeliness(data, dataType),
      validity: this.calculateValidity(data, dataType),
      uniqueness: this.calculateUniqueness(data, dataType),
      overallScore: 0
    };

    // Calculate overall score as weighted average
    const weights = { completeness: 0.25, accuracy: 0.25, consistency: 0.2, timeliness: 0.1, validity: 0.1, uniqueness: 0.1 };
    metrics.overallScore = Object.keys(weights).reduce((score, key) => {
      return score + (metrics[key as keyof DataQualityMetrics] * weights[key as keyof typeof weights]);
    }, 0);

    return metrics;
  }

  private calculateCompleteness(data: Record<string, any>, dataType: DataType): number {
    const requiredFields = this.getRequiredFields(dataType);
    const presentFields = requiredFields.filter(field => {
      const value = this.getNestedValue(data, field);
      return value !== undefined && value !== null && value !== '';
    });
    return presentFields.length / requiredFields.length;
  }

  private calculateAccuracy(data: Record<string, any>, dataType: DataType): number {
    // This is a simplified accuracy calculation
    // In a real implementation, you would have more sophisticated accuracy checks
    let accuracyScore = 1.0;
    
    // Check for obvious data quality issues
    if (dataType === DataType.MENTOR_PROFILE || dataType === DataType.MENTEE_PROFILE) {
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        accuracyScore -= 0.3;
      }
      if (data.name && data.name.length < 2) {
        accuracyScore -= 0.2;
      }
    }

    return Math.max(0, accuracyScore);
  }

  private calculateConsistency(data: Record<string, any>, dataType: DataType): number {
    // Check for internal consistency
    let consistencyScore = 1.0;

    if (dataType === DataType.MENTOR_PROFILE) {
      if (data.experienceYears && data.experienceYears > 50) {
        consistencyScore -= 0.2;
      }
      if (data.skills && Array.isArray(data.skills) && data.skills.length === 0) {
        consistencyScore -= 0.3;
      }
    }

    return Math.max(0, consistencyScore);
  }

  private calculateTimeliness(data: Record<string, any>, dataType: DataType): number {
    // Check if data is recent
    if (data.updatedAt || data.createdAt) {
      const lastUpdate = new Date(data.updatedAt || data.createdAt);
      const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceUpdate > 365) {
        return 0.5;
      } else if (daysSinceUpdate > 180) {
        return 0.7;
      } else if (daysSinceUpdate > 90) {
        return 0.8;
      } else {
        return 1.0;
      }
    }
    
    return 0.8; // Default score for data without timestamps
  }

  private calculateValidity(data: Record<string, any>, dataType: DataType): number {
    // Check if data follows expected formats and ranges
    let validityScore = 1.0;

    if (dataType === DataType.FEEDBACK) {
      if (data.rating && (data.rating < 1 || data.rating > 5)) {
        validityScore -= 0.5;
      }
    }

    if (dataType === DataType.PREFERENCE) {
      if (data.weight && (data.weight < 1 || data.weight > 10)) {
        validityScore -= 0.5;
      }
    }

    return Math.max(0, validityScore);
  }

  private calculateUniqueness(data: Record<string, any>, dataType: DataType): number {
    // This would typically check against existing data
    // For now, we'll assume uniqueness is high
    return 0.9;
  }

  private getRequiredFields(dataType: DataType): string[] {
    const fieldMaps = {
      [DataType.MENTOR_PROFILE]: ['name', 'email', 'skills', 'experienceYears'],
      [DataType.MENTEE_PROFILE]: ['name', 'email', 'learningGoals', 'experienceLevel'],
      [DataType.PREFERENCE]: ['mentorId', 'menteeId', 'preferenceType'],
      [DataType.INTERACTION]: ['mentorId', 'menteeId', 'sessionDate', 'duration'],
      [DataType.FEEDBACK]: ['mentorId', 'menteeId', 'rating']
    };

    return fieldMaps[dataType] || [];
  }

  async validateBatch(
    dataArray: Record<string, any>[],
    dataType: DataType,
    customRules?: DataValidationRule[]
  ): Promise<{
    validRecords: Record<string, any>[];
    invalidRecords: { data: Record<string, any>; errors: string[] }[];
    summary: {
      total: number;
      valid: number;
      invalid: number;
      qualityScore: number;
    };
  }> {
    const validRecords: Record<string, any>[] = [];
    const invalidRecords: { data: Record<string, any>; errors: string[] }[] = [];
    let totalQualityScore = 0;

    for (const data of dataArray) {
      const validationResult = await this.validateData(data, dataType, customRules);
      
      if (validationResult.isValid) {
        validRecords.push(data);
      } else {
        invalidRecords.push({
          data,
          errors: validationResult.errors
        });
      }
      
      totalQualityScore += validationResult.dataQuality;
    }

    return {
      validRecords,
      invalidRecords,
      summary: {
        total: dataArray.length,
        valid: validRecords.length,
        invalid: invalidRecords.length,
        qualityScore: dataArray.length > 0 ? totalQualityScore / dataArray.length : 0
      }
    };
  }
} 