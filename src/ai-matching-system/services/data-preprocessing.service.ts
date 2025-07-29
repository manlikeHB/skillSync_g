import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { DataPreprocessingConfig } from '../interfaces/data-preprocessing-config.interface';
import { DataQualityMetrics } from '../interfaces/data-quality-metrics.interface';
import { DataType } from '../enums/data-type.enum';

@Injectable()
export class DataPreprocessingService {
  private readonly logger = new Logger(DataPreprocessingService.name);

  async preprocessData(
    data: Record<string, any>[],
    config: DataPreprocessingConfig,
    dataType: DataType
  ): Promise<{
    processedData: Record<string, any>[];
    preprocessingMetrics: {
      originalCount: number;
      processedCount: number;
      outliersRemoved: number;
      featuresEngineered: number;
      processingTime: number;
    };
    qualityMetrics: DataQualityMetrics;
  }> {
    const startTime = Date.now();
    const originalCount = data.length;
    let processedData = [...data];

    try {
      this.logger.log(`Starting data preprocessing for ${dataType} with ${originalCount} records`);

      // Validate config structure
      if (!config || typeof config !== 'object') {
        this.logger.warn('Invalid preprocessing configuration provided.');
        throw new BadRequestException('Invalid preprocessing configuration.');
      }

      // Defensive: Ensure required config sections exist
      if (!config.outlierDetection || !config.featureEngineering || !config.normalization || !config.encoding) {
        this.logger.warn('Missing required preprocessing configuration sections.');
        throw new BadRequestException('Missing required preprocessing configuration sections.');
      }

      // Step 1: Outlier Detection and Removal
      if (config.outlierDetection.enabled) {
        processedData = await this.detectAndRemoveOutliers(processedData, config.outlierDetection, dataType);
        this.logger.log(`Outlier detection completed. Records after outlier removal: ${processedData.length}`);
      }

      // Step 2: Feature Engineering
      if (config.featureEngineering.enabled) {
        processedData = await this.engineerFeatures(processedData, config.featureEngineering, dataType);
        this.logger.log(`Feature engineering completed`);
      }

      // Step 3: Normalization
      if (config.normalization.enabled) {
        processedData = await this.normalizeData(processedData, config.normalization, dataType);
        this.logger.log(`Normalization completed`);
      }

      // Step 4: Encoding
      if (config.encoding.enabled) {
        processedData = await this.encodeCategoricalData(processedData, config.encoding, dataType);
        this.logger.log(`Encoding completed`);
      }

      const processingTime = Date.now() - startTime;
      const outliersRemoved = originalCount - processedData.length;
      const featuresEngineered = config.featureEngineering.enabled ? config.featureEngineering.features.length : 0;

      // Calculate quality metrics for processed data
      const qualityMetrics = await this.calculateProcessedDataQuality(processedData, dataType);

      this.logger.log(`Data preprocessing completed in ${processingTime}ms`);

      return {
        processedData,
        preprocessingMetrics: {
          originalCount,
          processedCount: processedData.length,
          outliersRemoved,
          featuresEngineered,
          processingTime
        },
        qualityMetrics
      };

    } catch (error) {
      this.logger.error(`Data preprocessing failed: ${error.message}`, error.stack);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(`Data preprocessing failed: ${error.message}`);
    }
  }

  private async detectAndRemoveOutliers(
    data: Record<string, any>[],
    outlierConfig: DataPreprocessingConfig['outlierDetection'],
    dataType: DataType
  ): Promise<Record<string, any>[]> {
    const numericFields = this.getNumericFields(dataType);
    const outliers: Record<string, any>[] = [];

    switch (outlierConfig.method) {
      case 'iqr':
        return this.detectOutliersIQR(data, numericFields, outlierConfig.threshold);
      case 'zscore':
        return this.detectOutliersZScore(data, numericFields, outlierConfig.threshold);
      case 'isolation_forest':
        return this.detectOutliersIsolationForest(data, numericFields, outlierConfig.threshold);
      default:
        throw new BadRequestException(`Unknown outlier detection method: ${outlierConfig.method}`);
    }
  }

  private detectOutliersIQR(
    data: Record<string, any>[],
    numericFields: string[],
    threshold: number
  ): Record<string, any>[] {
    const filteredData: Record<string, any>[] = [];

    for (const record of data) {
      let isOutlier = false;

      for (const field of numericFields) {
        const values = data.map(r => r[field]).filter(v => typeof v === 'number');
        if (values.length === 0) continue;

        const sorted = values.sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        const lowerBound = q1 - threshold * iqr;
        const upperBound = q3 + threshold * iqr;

        if (record[field] < lowerBound || record[field] > upperBound) {
          isOutlier = true;
          break;
        }
      }

      if (!isOutlier) {
        filteredData.push(record);
      }
    }

    return filteredData;
  }

  private detectOutliersZScore(
    data: Record<string, any>[],
    numericFields: string[],
    threshold: number
  ): Record<string, any>[] {
    const filteredData: Record<string, any>[] = [];

    for (const record of data) {
      let isOutlier = false;

      for (const field of numericFields) {
        const values = data.map(r => r[field]).filter(v => typeof v === 'number');
        if (values.length === 0) continue;

        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        if (stdDev === 0) continue;

        const zScore = Math.abs((record[field] - mean) / stdDev);
        if (zScore > threshold) {
          isOutlier = true;
          break;
        }
      }

      if (!isOutlier) {
        filteredData.push(record);
      }
    }

    return filteredData;
  }

  private detectOutliersIsolationForest(
    data: Record<string, any>[],
    numericFields: string[],
    threshold: number
  ): Record<string, any>[] {
    // Simplified isolation forest implementation
    // In a real implementation, you would use a proper ML library
    const filteredData: Record<string, any>[] = [];

    for (const record of data) {
      let outlierScore = 0;
      let validFields = 0;

      for (const field of numericFields) {
        const values = data.map(r => r[field]).filter(v => typeof v === 'number');
        if (values.length === 0) continue;

        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const distance = Math.abs(record[field] - mean);
        const maxDistance = Math.max(...values.map(v => Math.abs(v - mean)));
        
        outlierScore += distance / maxDistance;
        validFields++;
      }

      const averageScore = validFields > 0 ? outlierScore / validFields : 0;
      if (averageScore <= threshold) {
        filteredData.push(record);
      }
    }

    return filteredData;
  }

  private async engineerFeatures(
    data: Record<string, any>[],
    featureConfig: DataPreprocessingConfig['featureEngineering'],
    dataType: DataType
  ): Promise<Record<string, any>[]> {
    const engineeredData: Record<string, any>[] = [];

    for (const record of data) {
      const engineeredRecord = { ...record };

      // Apply feature engineering transformations
      for (const [feature, transformation] of Object.entries(featureConfig.transformations)) {
        try {
          engineeredRecord[feature] = this.applyTransformation(record, transformation);
        } catch (error) {
          this.logger.warn(`Feature engineering failed for ${feature}: ${error.message}`);
        }
      }

      engineeredData.push(engineeredRecord);
    }

    return engineeredData;
  }

  private applyTransformation(record: Record<string, any>, transformation: string): any {
    switch (transformation) {
      case 'skill_count':
        return Array.isArray(record.skills) ? record.skills.length : 0;
      
      case 'experience_level':
        if (record.experienceYears) {
          if (record.experienceYears < 2) return 'beginner';
          if (record.experienceYears < 5) return 'intermediate';
          if (record.experienceYears < 10) return 'advanced';
          return 'expert';
        }
        return 'unknown';
      
      case 'name_length':
        return record.name ? record.name.length : 0;
      
      case 'email_domain':
        if (record.email) {
          const parts = record.email.split('@');
          return parts.length > 1 ? parts[1] : 'unknown';
        }
        return 'unknown';
      
      case 'has_bio':
        return record.bio && record.bio.length > 0 ? 1 : 0;
      
      case 'rating_average':
        return record.ratings && Array.isArray(record.ratings) 
          ? record.ratings.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / record.ratings.length
          : 0;
      
      default:
        return record[transformation] || 0;
    }
  }

  private async normalizeData(
    data: Record<string, any>[],
    normalizationConfig: DataPreprocessingConfig['normalization'],
    dataType: DataType
  ): Promise<Record<string, any>[]> {
    const normalizedData: Record<string, any>[] = [];

    // Calculate normalization parameters
    const normalizationParams = this.calculateNormalizationParams(data, normalizationConfig.fields, normalizationConfig.method);

    for (const record of data) {
      const normalizedRecord = { ...record };

      for (const field of normalizationConfig.fields) {
        if (record[field] !== undefined && record[field] !== null) {
          normalizedRecord[field] = this.normalizeValue(
            record[field],
            normalizationParams[field],
            normalizationConfig.method
          );
        }
      }

      normalizedData.push(normalizedRecord);
    }

    return normalizedData;
  }

  private calculateNormalizationParams(
    data: Record<string, any>[],
    fields: string[],
    method: string
  ): Record<string, any> {
    const params: Record<string, any> = {};

    for (const field of fields) {
      const values = data.map(r => r[field]).filter(v => typeof v === 'number');
      if (values.length === 0) continue;

      switch (method) {
        case 'minmax':
          params[field] = {
            min: Math.min(...values),
            max: Math.max(...values)
          };
          break;
        
        case 'zscore':
          const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
          const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
          params[field] = {
            mean,
            stdDev: Math.sqrt(variance)
          };
          break;
        
        case 'robust':
          const sorted = values.sort((a, b) => a - b);
          const q1 = sorted[Math.floor(sorted.length * 0.25)];
          const q3 = sorted[Math.floor(sorted.length * 0.75)];
          params[field] = {
            q1,
            q3,
            iqr: q3 - q1
          };
          break;
      }
    }

    return params;
  }

  private normalizeValue(value: number, params: any, method: string): number {
    switch (method) {
      case 'minmax':
        const range = params.max - params.min;
        return range === 0 ? 0 : (value - params.min) / range;
      
      case 'zscore':
        return params.stdDev === 0 ? 0 : (value - params.mean) / params.stdDev;
      
      case 'robust':
        return params.iqr === 0 ? 0 : (value - params.q1) / params.iqr;
      
      default:
        return value;
    }
  }

  private async encodeCategoricalData(
    data: Record<string, any>[],
    encodingConfig: DataPreprocessingConfig['encoding'],
    dataType: DataType
  ): Promise<Record<string, any>[]> {
    const encodedData: Record<string, any>[] = [];

    // Calculate encoding mappings
    const encodingMappings = this.calculateEncodingMappings(data, encodingConfig.categoricalFields, encodingConfig.method);

    for (const record of data) {
      const encodedRecord = { ...record };

      for (const field of encodingConfig.categoricalFields) {
        if (record[field] !== undefined && record[field] !== null) {
          encodedRecord[field] = this.encodeValue(record[field], encodingMappings[field], encodingConfig.method);
        }
      }

      encodedData.push(encodedRecord);
    }

    return encodedData;
  }

  private calculateEncodingMappings(
    data: Record<string, any>[],
    categoricalFields: string[],
    method: string
  ): Record<string, any> {
    const mappings: Record<string, any> = {};

    for (const field of categoricalFields) {
      const uniqueValues = [...new Set(data.map(r => r[field]).filter(v => v !== undefined && v !== null))];
      
      switch (method) {
        case 'label':
          mappings[field] = uniqueValues.reduce((acc, value, index) => {
            acc[value] = index;
            return acc;
          }, {} as Record<string, number>);
          break;
        
        case 'onehot':
          mappings[field] = uniqueValues;
          break;
        
        case 'target':
          // For target encoding, we would need target values
          // This is a simplified implementation
          mappings[field] = uniqueValues.reduce((acc, value, index) => {
            acc[value] = index;
            return acc;
          }, {} as Record<string, number>);
          break;
      }
    }

    return mappings;
  }

  private encodeValue(value: any, mapping: any, method: string): any {
    switch (method) {
      case 'label':
        return mapping[value] !== undefined ? mapping[value] : -1;
      
      case 'onehot':
        const encoded = new Array(mapping.length).fill(0);
        const index = mapping.indexOf(value);
        if (index !== -1) {
          encoded[index] = 1;
        }
        return encoded;
      
      case 'target':
        return mapping[value] !== undefined ? mapping[value] : -1;
      
      default:
        return value;
    }
  }

  private getNumericFields(dataType: DataType): string[] {
    const fieldMaps = {
      [DataType.MENTOR_PROFILE]: ['experienceYears', 'reputationScore'],
      [DataType.MENTEE_PROFILE]: ['experienceLevel'],
      [DataType.PREFERENCE]: ['weight'],
      [DataType.INTERACTION]: ['duration'],
      [DataType.FEEDBACK]: ['rating']
    };

    return fieldMaps[dataType] || [];
  }

  private async calculateProcessedDataQuality(
    data: Record<string, any>[],
    dataType: DataType
  ): Promise<DataQualityMetrics> {
    // Calculate quality metrics for processed data
    const completeness = this.calculateCompleteness(data, dataType);
    const accuracy = this.calculateAccuracy(data, dataType);
    const consistency = this.calculateConsistency(data, dataType);
    const timeliness = this.calculateTimeliness(data, dataType);
    const validity = this.calculateValidity(data, dataType);
    const uniqueness = this.calculateUniqueness(data, dataType);

    const weights = { completeness: 0.25, accuracy: 0.25, consistency: 0.2, timeliness: 0.1, validity: 0.1, uniqueness: 0.1 };
    const overallScore = Object.keys(weights).reduce((score, key) => {
      return score + (this[`calculate${key.charAt(0).toUpperCase() + key.slice(1)}`](data, dataType) * weights[key as keyof typeof weights]);
    }, 0);

    return {
      completeness,
      accuracy,
      consistency,
      timeliness,
      validity,
      uniqueness,
      overallScore
    };
  }

  private calculateCompleteness(data: Record<string, any>[], dataType: DataType): number {
    const requiredFields = this.getRequiredFields(dataType);
    let totalCompleteness = 0;

    for (const record of data) {
      const presentFields = requiredFields.filter(field => {
        const value = this.getNestedValue(record, field);
        return value !== undefined && value !== null && value !== '';
      });
      totalCompleteness += presentFields.length / requiredFields.length;
    }

    return data.length > 0 ? totalCompleteness / data.length : 0;
  }

  private calculateAccuracy(data: Record<string, any>[], dataType: DataType): number {
    let accuracyScore = 0;

    for (const record of data) {
      let recordAccuracy = 1.0;

      if (dataType === DataType.MENTOR_PROFILE || dataType === DataType.MENTEE_PROFILE) {
        if (record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
          recordAccuracy -= 0.3;
        }
        if (record.name && record.name.length < 2) {
          recordAccuracy -= 0.2;
        }
      }

      accuracyScore += Math.max(0, recordAccuracy);
    }

    return data.length > 0 ? accuracyScore / data.length : 0;
  }

  private calculateConsistency(data: Record<string, any>[], dataType: DataType): number {
    let consistencyScore = 0;

    for (const record of data) {
      let recordConsistency = 1.0;

      if (dataType === DataType.MENTOR_PROFILE) {
        if (record.experienceYears && record.experienceYears > 50) {
          recordConsistency -= 0.2;
        }
        if (record.skills && Array.isArray(record.skills) && record.skills.length === 0) {
          recordConsistency -= 0.3;
        }
      }

      consistencyScore += Math.max(0, recordConsistency);
    }

    return data.length > 0 ? consistencyScore / data.length : 0;
  }

  private calculateTimeliness(data: Record<string, any>[], dataType: DataType): number {
    let timelinessScore = 0;

    for (const record of data) {
      if (record.updatedAt || record.createdAt) {
        const lastUpdate = new Date(record.updatedAt || record.createdAt);
        const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceUpdate > 365) {
          timelinessScore += 0.5;
        } else if (daysSinceUpdate > 180) {
          timelinessScore += 0.7;
        } else if (daysSinceUpdate > 90) {
          timelinessScore += 0.8;
        } else {
          timelinessScore += 1.0;
        }
      } else {
        timelinessScore += 0.8;
      }
    }

    return data.length > 0 ? timelinessScore / data.length : 0;
  }

  private calculateValidity(data: Record<string, any>[], dataType: DataType): number {
    let validityScore = 0;

    for (const record of data) {
      let recordValidity = 1.0;

      if (dataType === DataType.FEEDBACK) {
        if (record.rating && (record.rating < 1 || record.rating > 5)) {
          recordValidity -= 0.5;
        }
      }

      if (dataType === DataType.PREFERENCE) {
        if (record.weight && (record.weight < 1 || record.weight > 10)) {
          recordValidity -= 0.5;
        }
      }

      validityScore += Math.max(0, recordValidity);
    }

    return data.length > 0 ? validityScore / data.length : 0;
  }

  private calculateUniqueness(data: Record<string, any>[], dataType: DataType): number {
    // Simplified uniqueness calculation
    const uniqueIds = new Set(data.map(record => record.id || record.userId));
    return data.length > 0 ? uniqueIds.size / data.length : 0;
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

  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
} 