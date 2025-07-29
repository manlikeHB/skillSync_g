import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner, DataSource } from 'typeorm';
import { FeatureVector } from '../entities/feature-vector.entity';
import {
  CleanedMentorData,
  CleanedMenteeData,
  MatchingFeatureVector,
} from '../interfaces/pipeline.interface';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class DataLoadingService {
  private readonly logger = new Logger(DataLoadingService.name);

  constructor(
    @InjectRepository(FeatureVector)
    private featureVectorRepository: Repository<FeatureVector>,
    private dataSource: DataSource,
    private redisService: RedisService,
  ) {}

  async loadFeatureVectors(vectors: MatchingFeatureVector[]): Promise<void> {
    this.logger.log(`Loading ${vectors.length} feature vectors`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Batch insert feature vectors
      const batchSize = 1000;
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        await this.insertFeatureVectorBatch(queryRunner, batch);
        this.logger.log(
          `Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)}`,
        );
      }

      await queryRunner.commitTransaction();
      this.logger.log('Successfully loaded all feature vectors');

      // Update cache with latest vectors
      await this.updateFeatureVectorCache(vectors);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to load feature vectors:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async insertFeatureVectorBatch(
    queryRunner: QueryRunner,
    batch: MatchingFeatureVector[],
  ): Promise<void> {
    const entities = batch.map((vector) => {
      const entity = new FeatureVector();
      entity.userId = vector.userId;
      entity.userType = vector.userType;
      entity.features = vector.features;
      entity.qualityScore = vector.metadata.qualityScore;
      entity.version = vector.metadata.version;
      entity.metadata = { lastUpdated: vector.metadata.lastUpdated };
      return entity;
    });

    // Use upsert to handle conflicts
    await queryRunner.manager
      .createQueryBuilder()
      .insert()
      .into(FeatureVector)
      .values(entities)
      .orUpdate({
        conflict_target: ['userId'],
        overwrite: [
          'features',
          'qualityScore',
          'version',
          'metadata',
          'lastUpdated',
        ],
      })
      .execute();
  }

  async loadCleanedData(
    mentors: CleanedMentorData[],
    mentees: CleanedMenteeData[],
  ): Promise<void> {
    this.logger.log(
      `Loading ${mentors.length} mentors and ${mentees.length} mentees to cache`,
    );

    try {
      // Store cleaned data in Redis for fast access
      const pipeline = this.redisService.getClient().pipeline();

      // Store mentor data
      for (const mentor of mentors) {
        const key = `cleaned_mentor:${mentor.userId}`;
        pipeline.setex(key, 3600 * 24, JSON.stringify(mentor)); // 24 hour TTL
      }

      // Store mentee data
      for (const mentee of mentees) {
        const key = `cleaned_mentee:${mentee.userId}`;
        pipeline.setex(key, 3600 * 24, JSON.stringify(mentee)); // 24 hour TTL
      }

      // Create indexes for fast lookup
      const mentorIds = mentors.map((m) => m.userId);
      const menteeIds = mentees.map((m) => m.userId);

      pipeline.setex('mentor_ids', 3600 * 24, JSON.stringify(mentorIds));
      pipeline.setex('mentee_ids', 3600 * 24, JSON.stringify(menteeIds));

      await pipeline.exec();
      this.logger.log('Successfully loaded cleaned data to cache');
    } catch (error) {
      this.logger.error('Failed to load cleaned data:', error);
      throw error;
    }
  }

  private async updateFeatureVectorCache(
    vectors: MatchingFeatureVector[],
  ): Promise<void> {
    try {
      const pipeline = this.redisService.getClient().pipeline();

      for (const vector of vectors) {
        const key = `feature_vector:${vector.userId}`;
        pipeline.setex(key, 3600 * 6, JSON.stringify(vector)); // 6 hour TTL
      }

      // Create type-based indexes
      const mentorVectors = vectors
        .filter((v) => v.userType === 'mentor')
        .map((v) => v.userId);
      const menteeVectors = vectors
        .filter((v) => v.userType === 'mentee')
        .map((v) => v.userId);

      pipeline.setex(
        'feature_vectors:mentors',
        3600 * 6,
        JSON.stringify(mentorVectors),
      );
      pipeline.setex(
        'feature_vectors:mentees',
        3600 * 6,
        JSON.stringify(menteeVectors),
      );

      await pipeline.exec();
      this.logger.log('Successfully updated feature vector cache');
    } catch (error) {
      this.logger.error('Failed to update feature vector cache:', error);
      throw error;
    }
  }

  async getFeatureVector(
    userId: string,
  ): Promise<MatchingFeatureVector | null> {
    try {
      const cached = await this.redisService
        .getClient()
        .get(`feature_vector:${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fallback to database
      const entity = await this.featureVectorRepository.findOne({
        where: { userId },
      });

      if (entity) {
        const vector: MatchingFeatureVector = {
          userId: entity.userId,
          userType: entity.userType as 'mentor' | 'mentee',
          features: entity.features,
          metadata: {
            lastUpdated: entity.lastUpdated,
            version: entity.version,
            qualityScore: entity.qualityScore,
          },
        };

        // Cache for future use
        await this.redisService
          .getClient()
          .setex(`feature_vector:${userId}`, 3600 * 6, JSON.stringify(vector));

        return vector;
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Failed to get feature vector for user ${userId}:`,
        error,
      );
      return null;
    }
  }

  async getFeatureVectorsBatch(
    userIds: string[],
  ): Promise<MatchingFeatureVector[]> {
    const vectors: MatchingFeatureVector[] = [];
    const uncachedIds: string[] = [];

    // Try to get from cache first
    const pipeline = this.redisService.getClient().pipeline();
    userIds.forEach((id) => pipeline.get(`feature_vector:${id}`));

    const results = await pipeline.exec();

    results?.forEach((result, index) => {
      if (result && result[1]) {
        try {
          vectors.push(JSON.parse(result[1] as string));
        } catch (error) {
          uncachedIds.push(userIds[index]);
        }
      } else {
        uncachedIds.push(userIds[index]);
      }
    });

    // Get uncached vectors from database
    if (uncachedIds.length > 0) {
      const entities = await this.featureVectorRepository.find({
        where: { userId: { $in: uncachedIds } as any },
      });

      const dbVectors = entities.map((entity) => ({
        userId: entity.userId,
        userType: entity.userType as 'mentor' | 'mentee',
        features: entity.features,
        metadata: {
          lastUpdated: entity.lastUpdated,
          version: entity.version,
          qualityScore: entity.qualityScore,
        },
      }));

      vectors.push(...dbVectors);

      // Cache the database results
      const cachePipeline = this.redisService.getClient().pipeline();
      dbVectors.forEach((vector) => {
        cachePipeline.setex(
          `feature_vector:${vector.userId}`,
          3600 * 6,
          JSON.stringify(vector),
        );
      });
      await cachePipeline.exec();
    }

    return vectors;
  }

  async validateDataQuality(vectors: MatchingFeatureVector[]): Promise<{
    totalVectors: number;
    highQuality: number;
    mediumQuality: number;
    lowQuality: number;
    averageQuality: number;
    issues: string[];
  }> {
    const issues: string[] = [];
    let highQuality = 0;
    let mediumQuality = 0;
    let lowQuality = 0;
    let totalQuality = 0;

    for (const vector of vectors) {
      const quality = vector.metadata.qualityScore;
      totalQuality += quality;

      if (quality >= 80) {
        highQuality++;
      } else if (quality >= 50) {
        mediumQuality++;
      } else {
        lowQuality++;
        issues.push(
          `Low quality vector for user ${vector.userId}: ${quality}%`,
        );
      }

      // Check for empty feature vectors
      const hasEmptyFeatures = Object.values(vector.features).some(
        (featureArray) =>
          !Array.isArray(featureArray) || featureArray.length === 0,
      );

      if (hasEmptyFeatures) {
        issues.push(`Empty feature vectors for user ${vector.userId}`);
      }

      // Check for NaN or infinite values
      const hasInvalidValues = Object.values(vector.features).some(
        (featureArray) => featureArray.some((val) => !isFinite(val)),
      );

      if (hasInvalidValues) {
        issues.push(`Invalid feature values for user ${vector.userId}`);
      }
    }

    return {
      totalVectors: vectors.length,
      highQuality,
      mediumQuality,
      lowQuality,
      averageQuality: vectors.length > 0 ? totalQuality / vectors.length : 0,
      issues,
    };
  }
}
