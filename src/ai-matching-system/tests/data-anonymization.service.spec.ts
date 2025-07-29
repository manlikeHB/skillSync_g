import { Test, TestingModule } from '@nestjs/testing';
import { DataAnonymizationService } from '../services/data-anonymization.service';
import { DataCollection, DataType, DataStatus } from '../entities/data-collection.entity';
import { DataAnonymizationConfig } from '../interfaces/data-anonymization-config.interface';
import { PrivacyMetrics } from '../interfaces/data-quality-metrics.interface';

describe('DataAnonymizationService', () => {
  let service: DataAnonymizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataAnonymizationService],
    }).compile();

    service = module.get<DataAnonymizationService>(DataAnonymizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('anonymizeData', () => {
    it('should anonymize mentor profile data with k-anonymity', async () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        skills: ['JavaScript', 'React'],
        experience: 5,
        bio: 'Experienced developer',
        location: 'New York, NY'
      };

      const config: DataAnonymizationConfig = {
        kAnonymity: 3,
        lDiversity: 2,
        tCloseness: 0.1,
        generalization: {
          fields: {
            location: { type: 'hierarchy', levels: ['city', 'state', 'country'] },
            experience: { type: 'range', granularity: 5 }
          }
        },
        suppression: {
          fields: ['phone', 'email']
        },
        pseudonymization: {
          fields: ['name']
        },
        dataRetentionDays: 30,
        anonymizationLevel: 'medium',
        consentGiven: true,
        dataCategories: ['personal', 'professional']
      };

      const result = await service.anonymizeData(data, config, DataType.MENTOR_PROFILE);

      expect(result).toBeDefined();
      expect(result.anonymizedData).toBeDefined();
      expect(result.privacyMetrics).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.privacyMetrics.kAnonymityLevel).toBeGreaterThan(0);
      expect(result.privacyMetrics.privacyGain).toBeGreaterThan(0);
    });

    it('should anonymize mentee profile data with l-diversity', async () => {
      const data = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        interests: ['Machine Learning', 'Python'],
        goals: 'Learn advanced ML techniques',
        availability: 'Weekends',
        age: 25,
        education: 'Bachelor in Computer Science'
      };

      const config: DataAnonymizationConfig = {
        lDiversity: 3,
        generalization: {
          fields: {
            age: { type: 'range', granularity: 10 },
            education: { type: 'hierarchy', levels: ['level', 'field'] }
          }
        },
        suppression: {
          fields: ['email']
        },
        dataRetentionDays: 30,
        anonymizationLevel: 'high',
        consentGiven: true,
        dataCategories: ['personal', 'educational']
      };

      const result = await service.anonymizeData(data, config, DataType.MENTEE_PROFILE);

      expect(result).toBeDefined();
      expect(result.anonymizedData).toBeDefined();
      expect(result.privacyMetrics.lDiversityLevel).toBeGreaterThan(0);
      expect(result.privacyMetrics.consentCompliance).toBe(true);
    });

    it('should apply noise addition to numerical data', async () => {
      const data = {
        name: 'Bob Wilson',
        experience: 7,
        salary: 75000,
        rating: 4.5
      };

      const config: DataAnonymizationConfig = {
        noiseAddition: {
          fields: {
            experience: { type: 'gaussian', magnitude: 1 },
            salary: { type: 'gaussian', magnitude: 5000 },
            rating: { type: 'gaussian', magnitude: 0.2 }
          }
        },
        dataRetentionDays: 30,
        anonymizationLevel: 'medium',
        consentGiven: true,
        dataCategories: ['professional']
      };

      const result = await service.anonymizeData(data, config, DataType.MENTOR_PROFILE);

      expect(result).toBeDefined();
      expect(result.anonymizedData.experience).not.toBe(data.experience);
      expect(result.anonymizedData.salary).not.toBe(data.salary);
      expect(result.anonymizedData.rating).not.toBe(data.rating);
      expect(result.privacyMetrics.informationLoss).toBeGreaterThan(0);
    });

    it('should apply microaggregation to grouped data', async () => {
      const data = {
        name: 'Alice Johnson',
        age: 28,
        experience: 6,
        skills: ['Java', 'Spring', 'Hibernate']
      };

      const config: DataAnonymizationConfig = {
        microaggregation: {
          fields: {
            age: { aggregationSize: 5 },
            experience: { aggregationSize: 3 }
          }
        },
        dataRetentionDays: 30,
        anonymizationLevel: 'medium',
        consentGiven: true,
        dataCategories: ['personal', 'professional']
      };

      const result = await service.anonymizeData(data, config, DataType.MENTOR_PROFILE);

      expect(result).toBeDefined();
      expect(result.anonymizedData).toBeDefined();
      expect(result.privacyMetrics.informationLoss).toBeGreaterThan(0);
    });

    it('should handle empty data gracefully', async () => {
      const data = {};
      const config: DataAnonymizationConfig = {
        kAnonymity: 3,
        dataRetentionDays: 30,
        anonymizationLevel: 'medium',
        consentGiven: true,
        dataCategories: ['personal']
      };

      const result = await service.anonymizeData(data, config, DataType.MENTOR_PROFILE);

      expect(result).toBeDefined();
      expect(result.anonymizedData).toEqual({});
      expect(result.privacyMetrics).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should handle configuration with no anonymization techniques', async () => {
      const data = {
        name: 'Test User',
        email: 'test@example.com'
      };

      const config: DataAnonymizationConfig = {
        dataRetentionDays: 30,
        anonymizationLevel: 'low',
        consentGiven: true,
        dataCategories: ['personal']
      };

      const result = await service.anonymizeData(data, config, DataType.MENTOR_PROFILE);

      expect(result).toBeDefined();
      expect(result.anonymizedData).toEqual(data);
      expect(result.privacyMetrics.privacyGain).toBe(0);
      expect(result.privacyMetrics.informationLoss).toBe(0);
    });
  });

  describe('anonymizeBatch', () => {
    it('should anonymize multiple data collections', async () => {
      const collections: DataCollection[] = [
        {
          id: '1',
          userId: 'user-1',
          dataType: DataType.MENTOR_PROFILE,
          status: DataStatus.PROCESSED,
          rawData: {
            name: 'John Doe',
            email: 'john@example.com',
            skills: ['JavaScript', 'React'],
            experience: 5
          },
          processedData: {},
          anonymizedData: {},
          validationResults: { isValid: true, errors: [], warnings: [], dataQuality: 1 },
          privacyMetadata: { anonymizationLevel: '', dataRetentionDays: 0, consentGiven: false, consentDate: new Date(), dataCategories: [] },
          errorMessage: '',
          processingMetadata: { processingTime: 0, algorithm: '', version: '', checksum: '' },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          userId: 'user-2',
          dataType: DataType.MENTEE_PROFILE,
          status: DataStatus.PROCESSED,
          rawData: {
            name: 'Jane Smith',
            email: 'jane@example.com',
            interests: ['Machine Learning', 'Python'],
            goals: 'Learn advanced ML techniques'
          },
          processedData: {},
          anonymizedData: {},
          validationResults: { isValid: true, errors: [], warnings: [], dataQuality: 1 },
          privacyMetadata: { anonymizationLevel: '', dataRetentionDays: 0, consentGiven: false, consentDate: new Date(), dataCategories: [] },
          errorMessage: '',
          processingMetadata: { processingTime: 0, algorithm: '', version: '', checksum: '' },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const config: DataAnonymizationConfig = {
        kAnonymity: 2,
        suppression: {
          fields: ['email']
        },
        pseudonymization: {
          fields: ['name']
        },
        dataRetentionDays: 30,
        anonymizationLevel: 'medium',
        consentGiven: true,
        dataCategories: ['personal']
      };

      const result = await service.anonymizeBatch(collections, config);

      expect(result).toBeDefined();
      expect(result.anonymizedCollections).toHaveLength(2);
      expect(result.privacyMetrics).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.totalRecords).toBe(2);
      expect(result.metadata.successfulRecords).toBe(2);
      expect(result.metadata.failedRecords).toBe(0);
    });

    it('should handle errors during batch anonymization', async () => {
      const collections: DataCollection[] = [
        {
          id: '1',
          userId: 'user-1',
          dataType: DataType.MENTOR_PROFILE,
          status: DataStatus.PROCESSED,
          rawData: {
            name: 'John Doe',
            email: 'john@example.com',
            skills: ['JavaScript', 'React'],
            experience: 5
          },
          processedData: {},
          anonymizedData: {},
          validationResults: { isValid: true, errors: [], warnings: [], dataQuality: 1 },
          privacyMetadata: { anonymizationLevel: '', dataRetentionDays: 0, consentGiven: false, consentDate: new Date(), dataCategories: [] },
          errorMessage: '',
          processingMetadata: { processingTime: 0, algorithm: '', version: '', checksum: '' },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          userId: 'user-2',
          dataType: DataType.MENTOR_PROFILE,
          status: DataStatus.PROCESSED,
          rawData: {}, // This will cause an error
          processedData: {},
          anonymizedData: {},
          validationResults: { isValid: true, errors: [], warnings: [], dataQuality: 1 },
          privacyMetadata: { anonymizationLevel: '', dataRetentionDays: 0, consentGiven: false, consentDate: new Date(), dataCategories: [] },
          errorMessage: '',
          processingMetadata: { processingTime: 0, algorithm: '', version: '', checksum: '' },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const config: DataAnonymizationConfig = {
        kAnonymity: 2,
        dataRetentionDays: 30,
        anonymizationLevel: 'medium',
        consentGiven: true,
        dataCategories: ['personal']
      };

      const result = await service.anonymizeBatch(collections, config);

      expect(result).toBeDefined();
      expect(result.anonymizedCollections).toHaveLength(2);
      expect(result.metadata.successfulRecords).toBe(1);
      expect(result.metadata.failedRecords).toBe(1);
      
      const successfulCollection = result.anonymizedCollections.find(c => c.status === 'anonymized');
      const failedCollection = result.anonymizedCollections.find(c => c.status === 'error');
      
      expect(successfulCollection).toBeDefined();
      expect(failedCollection).toBeDefined();
      expect(failedCollection.errorMessage).toBeDefined();
    });
  });

  describe('privacy metrics calculation', () => {
    it('should calculate privacy metrics correctly', async () => {
      const originalData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        age: 30,
        salary: 75000
      };

      const anonymizedData = {
        name: 'pseudo_abc123',
        email: '[SUPPRESSED]',
        phone: '[SUPPRESSED]',
        age: 25,
        salary: 70000
      };

      const config: DataAnonymizationConfig = {
        kAnonymity: 3,
        dataRetentionDays: 30,
        anonymizationLevel: 'medium',
        consentGiven: true,
        dataCategories: ['personal']
      };

      // This is a simplified test since the actual calculation methods are private
      // In a real implementation, you might expose these methods for testing
      const result = await service.anonymizeData(originalData, config, DataType.MENTOR_PROFILE);

      expect(result).toBeDefined();
      expect(result.privacyMetrics.kAnonymityLevel).toBeGreaterThan(0);
      expect(result.privacyMetrics.lDiversityLevel).toBeGreaterThan(0);
      expect(result.privacyMetrics.tClosenessLevel).toBeGreaterThan(0);
      expect(result.privacyMetrics.informationLoss).toBeGreaterThan(0);
      expect(result.privacyMetrics.privacyGain).toBeGreaterThan(0);
      expect(result.privacyMetrics.anonymizationRatio).toBeGreaterThan(0);
      expect(result.privacyMetrics.dataRetentionCompliance).toBe(true);
      expect(result.privacyMetrics.consentCompliance).toBe(true);
    });
  });

  describe('anonymization techniques', () => {
    it('should apply k-anonymity technique', async () => {
      const data = {
        age: 25,
        location: 'New York',
        salary: 50000
      };

      const config: DataAnonymizationConfig = {
        kAnonymity: 3,
        dataRetentionDays: 30,
        anonymizationLevel: 'medium',
        consentGiven: true,
        dataCategories: ['personal']
      };

      const result = await service.anonymizeData(data, config, DataType.MENTOR_PROFILE);

      expect(result).toBeDefined();
      expect(result.anonymizedData).toBeDefined();
      expect(result.privacyMetrics.kAnonymityLevel).toBeGreaterThan(0);
    });

    it('should apply l-diversity technique', async () => {
      const data = {
        age: 25,
        location: 'New York',
        salary: 50000
      };

      const config: DataAnonymizationConfig = {
        lDiversity: 2,
        dataRetentionDays: 30,
        anonymizationLevel: 'medium',
        consentGiven: true,
        dataCategories: ['personal']
      };

      const result = await service.anonymizeData(data, config, DataType.MENTOR_PROFILE);

      expect(result).toBeDefined();
      expect(result.anonymizedData).toBeDefined();
      expect(result.privacyMetrics.lDiversityLevel).toBeGreaterThan(0);
    });

    it('should apply t-closeness technique', async () => {
      const data = {
        age: 25,
        location: 'New York',
        salary: 50000
      };

      const config: DataAnonymizationConfig = {
        tCloseness: 0.1,
        dataRetentionDays: 30,
        anonymizationLevel: 'medium',
        consentGiven: true,
        dataCategories: ['personal']
      };

      const result = await service.anonymizeData(data, config, DataType.MENTOR_PROFILE);

      expect(result).toBeDefined();
      expect(result.anonymizedData).toBeDefined();
      expect(result.privacyMetrics.tClosenessLevel).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle invalid configuration gracefully', async () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com'
      };

      const config: DataAnonymizationConfig = {
        kAnonymity: -1, // Invalid k value
        dataRetentionDays: 30,
        anonymizationLevel: 'medium',
        consentGiven: true,
        dataCategories: ['personal']
      };

      await expect(service.anonymizeData(data, config, DataType.MENTOR_PROFILE))
        .rejects.toThrow();
    });

    it('should handle null data gracefully', async () => {
      const data = null;
      const config: DataAnonymizationConfig = {
        dataRetentionDays: 30,
        anonymizationLevel: 'medium',
        consentGiven: true,
        dataCategories: ['personal']
      };

      await expect(service.anonymizeData(data, config, DataType.MENTOR_PROFILE))
        .rejects.toThrow();
    });
  });
}); 