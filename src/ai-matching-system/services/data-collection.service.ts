import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataCollection } from '../entities/data-collection.entity';
import { DataWorkflow } from '../entities/data-workflow.entity';
import { DataType } from '../enums/data-type.enum';
import { DataStatus } from '../enums/data-status.enum';
import { WorkflowType } from '../enums/workflow-type.enum';
import { WorkflowStatus } from '../enums/workflow-status.enum';
import { CreateDataCollectionDto, UpdateDataCollectionDto, DataCollectionQueryDto } from '../dtos/data-collection.dto';
import { CreateDataProcessingDto, DataProcessingQueryDto } from '../dtos/data-processing.dto';

@Injectable()
export class DataCollectionService {
  private readonly logger = new Logger(DataCollectionService.name);

  constructor(
    @InjectRepository(DataCollection)
    private readonly dataCollectionRepository: Repository<DataCollection>,
    @InjectRepository(DataWorkflow)
    private readonly dataWorkflowRepository: Repository<DataWorkflow>
  ) {}

  // Data Collection Operations

  async create(createDto: CreateDataCollectionDto): Promise<DataCollection> {
    try {
      this.logger.log(`Creating data collection for user: ${createDto.userId}`);

      const dataCollection = this.dataCollectionRepository.create({
        userId: createDto.userId,
        dataType: createDto.dataType,
        status: DataStatus.COLLECTED,
        rawData: createDto.rawData,
        privacyMetadata: createDto.privacyMetadata
      });

      const savedCollection = await this.dataCollectionRepository.save(dataCollection);
      this.logger.log(`Data collection created with ID: ${savedCollection.id}`);

      return savedCollection;
    } catch (error) {
      this.logger.error(`Error creating data collection: ${error.message}`, error.stack);
      throw new Error(`Failed to create data collection: ${error.message}`);
    }
  }

  async findAll(query: DataCollectionQueryDto): Promise<{
    collections: DataCollection[];
    total: number;
    metadata: Record<string, any>;
  }> {
    try {
      this.logger.log('Retrieving data collections with filters');

      const queryBuilder = this.dataCollectionRepository.createQueryBuilder('collection');

      // Apply filters
      if (query.userId) {
        queryBuilder.andWhere('collection.userId = :userId', { userId: query.userId });
      }

      if (query.dataType) {
        queryBuilder.andWhere('collection.dataType = :dataType', { dataType: query.dataType });
      }

      if (query.startDate) {
        queryBuilder.andWhere('collection.createdAt >= :startDate', { startDate: query.startDate });
      }

      if (query.endDate) {
        queryBuilder.andWhere('collection.createdAt <= :endDate', { endDate: query.endDate });
      }

      // Apply pagination
      const page = query.page || 1;
      const limit = query.limit || 10;
      const offset = (page - 1) * limit;

      queryBuilder.skip(offset).take(limit);

      // Apply sorting
      const sortBy = query.sortBy || 'createdAt';
      const sortOrder = query.sortOrder || 'DESC';
      queryBuilder.orderBy(`collection.${sortBy}`, sortOrder as 'ASC' | 'DESC');

      const [collections, total] = await queryBuilder.getManyAndCount();

      const metadata = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrevious: page > 1
      };

      return { collections, total, metadata };
    } catch (error) {
      this.logger.error(`Error retrieving data collections: ${error.message}`, error.stack);
      throw new Error(`Failed to retrieve data collections: ${error.message}`);
    }
  }

  async findById(id: string): Promise<DataCollection | null> {
    try {
      this.logger.log(`Finding data collection by ID: ${id}`);
      return await this.dataCollectionRepository.findOne({ where: { id } });
    } catch (error) {
      this.logger.error(`Error finding data collection ${id}: ${error.message}`, error.stack);
      throw new Error(`Failed to find data collection: ${error.message}`);
    }
  }

  async findByIds(ids: string[]): Promise<DataCollection[]> {
    try {
      this.logger.log(`Finding data collections by IDs: ${ids.join(', ')}`);
      return await this.dataCollectionRepository.findByIds(ids);
    } catch (error) {
      this.logger.error(`Error finding data collections by IDs: ${error.message}`, error.stack);
      throw new Error(`Failed to find data collections: ${error.message}`);
    }
  }

  async update(id: string, updateDto: UpdateDataCollectionDto): Promise<DataCollection | null> {
    try {
      this.logger.log(`Updating data collection: ${id}`);

      const dataCollection = await this.dataCollectionRepository.findOne({ where: { id } });
      if (!dataCollection) {
        return null;
      }

      // Update fields
      if (updateDto.processedData) {
        dataCollection.processedData = updateDto.processedData;
      }

      if (updateDto.anonymizedData) {
        dataCollection.anonymizedData = updateDto.anonymizedData;
      }

      // Fix validationResults assignment
      if (updateDto.validationResults) {
        dataCollection.validationResults = {
          isValid: updateDto.validationResults.isValid || false,
          errors: updateDto.validationResults.errors || [],
          warnings: updateDto.validationResults.warnings || [],
          dataQuality: updateDto.validationResults.dataQuality || 0
        };
      }

      // Fix privacyMetadata assignment
      if (updateDto.privacyMetadata) {
        dataCollection.privacyMetadata = {
          anonymizationLevel: updateDto.privacyMetadata.anonymizationLevel || '',
          dataRetentionDays: updateDto.privacyMetadata.dataRetentionDays || 0,
          consentGiven: updateDto.privacyMetadata.consentGiven || false,
          consentDate: updateDto.privacyMetadata.consentDate ? new Date(updateDto.privacyMetadata.consentDate) : new Date(),
          dataCategories: updateDto.privacyMetadata.dataCategories || []
        };
      }

      // Fix processingMetadata assignment
      if (updateDto.processingMetadata) {
        dataCollection.processingMetadata = {
          processingTime: updateDto.processingMetadata.processingTime || 0,
          algorithm: updateDto.processingMetadata.algorithm || '',
          version: updateDto.processingMetadata.version || '',
          checksum: updateDto.processingMetadata.checksum || ''
        };
      }

      if (updateDto.errorMessage) {
        dataCollection.errorMessage = updateDto.errorMessage;
      }

      const updatedCollection = await this.dataCollectionRepository.save(dataCollection);
      this.logger.log(`Data collection updated: ${id}`);

      return updatedCollection;
    } catch (error) {
      this.logger.error(`Error updating data collection ${id}: ${error.message}`, error.stack);
      throw new Error(`Failed to update data collection: ${error.message}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      this.logger.log(`Deleting data collection: ${id}`);

      const dataCollection = await this.dataCollectionRepository.findOne({ where: { id } });
      if (!dataCollection) {
        return false;
      }

      await this.dataCollectionRepository.remove(dataCollection);
      this.logger.log(`Data collection deleted: ${id}`);

      return true;
    } catch (error) {
      this.logger.error(`Error deleting data collection ${id}: ${error.message}`, error.stack);
      throw new Error(`Failed to delete data collection: ${error.message}`);
    }
  }

  // Workflow Operations

  async createWorkflow(workflowData: {
    workflowType: WorkflowType;
    configuration: any;
    inputData: any;
  }): Promise<DataWorkflow> {
    try {
      this.logger.log(`Creating workflow of type: ${workflowData.workflowType}`);

      const workflow = this.dataWorkflowRepository.create({
        workflowType: workflowData.workflowType,
        status: WorkflowStatus.PENDING,
        configuration: workflowData.configuration,
        inputData: workflowData.inputData
      });

      const savedWorkflow = await this.dataWorkflowRepository.save(workflow);
      this.logger.log(`Workflow created with ID: ${savedWorkflow.id}`);

      return savedWorkflow;
    } catch (error) {
      this.logger.error(`Error creating workflow: ${error.message}`, error.stack);
      throw new Error(`Failed to create workflow: ${error.message}`);
    }
  }

  async updateWorkflow(id: string, updateData: Partial<DataWorkflow>): Promise<DataWorkflow | null> {
    try {
      this.logger.log(`Updating workflow: ${id}`);

      const workflow = await this.dataWorkflowRepository.findOne({ where: { id } });
      if (!workflow) {
        return null;
      }

      // Update fields
      if (updateData.status) {
        workflow.status = updateData.status;
      }

      if (updateData.outputData) {
        workflow.outputData = updateData.outputData;
      }

      if (updateData.executionMetrics) {
        workflow.executionMetrics = updateData.executionMetrics;
      }

      if (updateData.errorMessage) {
        workflow.errorMessage = updateData.errorMessage;
      }

      if (updateData.progress) {
        workflow.progress = updateData.progress;
      }

      if (updateData.logs) {
        workflow.logs = updateData.logs;
      }

      const updatedWorkflow = await this.dataWorkflowRepository.save(workflow);
      this.logger.log(`Workflow updated: ${id}`);

      return updatedWorkflow;
    } catch (error) {
      this.logger.error(`Error updating workflow ${id}: ${error.message}`, error.stack);
      throw new Error(`Failed to update workflow: ${error.message}`);
    }
  }

  async findWorkflowById(id: string): Promise<DataWorkflow | null> {
    try {
      this.logger.log(`Finding workflow by ID: ${id}`);
      return await this.dataWorkflowRepository.findOne({ where: { id } });
    } catch (error) {
      this.logger.error(`Error finding workflow ${id}: ${error.message}`, error.stack);
      throw new Error(`Failed to find workflow: ${error.message}`);
    }
  }

  async findAllWorkflows(query: DataProcessingQueryDto): Promise<{
    workflows: DataWorkflow[];
    total: number;
    metadata: Record<string, any>;
  }> {
    try {
      this.logger.log('Retrieving workflows with filters');

      const queryBuilder = this.dataWorkflowRepository.createQueryBuilder('workflow');

      // Apply filters
      if (query.workflowType) {
        queryBuilder.andWhere('workflow.workflowType = :workflowType', { workflowType: query.workflowType });
      }

      if (query.status) {
        queryBuilder.andWhere('workflow.status = :status', { status: query.status });
      }

      if (query.startDate) {
        queryBuilder.andWhere('workflow.createdAt >= :startDate', { startDate: query.startDate });
      }

      if (query.endDate) {
        queryBuilder.andWhere('workflow.createdAt <= :endDate', { endDate: query.endDate });
      }

      // Apply pagination
      const page = query.page || 1;
      const limit = query.limit || 10;
      const offset = (page - 1) * limit;

      queryBuilder.skip(offset).take(limit);

      // Apply sorting
      const sortBy = query.sortBy || 'createdAt';
      const sortOrder = query.sortOrder || 'DESC';
      queryBuilder.orderBy(`workflow.${sortBy}`, sortOrder as 'ASC' | 'DESC');

      const [workflows, total] = await queryBuilder.getManyAndCount();

      const metadata = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrevious: page > 1
      };

      return { workflows, total, metadata };
    } catch (error) {
      this.logger.error(`Error retrieving workflows: ${error.message}`, error.stack);
      throw new Error(`Failed to retrieve workflows: ${error.message}`);
    }
  }

  // Analytics and Reporting

  async getDataCollectionStats(): Promise<Record<string, any>> {
    try {
      this.logger.log('Generating data collection statistics');

      const totalCollections = await this.dataCollectionRepository.count();
      const collectionsByType = await this.dataCollectionRepository
        .createQueryBuilder('collection')
        .select('collection.dataType', 'dataType')
        .addSelect('COUNT(*)', 'count')
        .groupBy('collection.dataType')
        .getRawMany();

      const collectionsByStatus = await this.dataCollectionRepository
        .createQueryBuilder('collection')
        .select('collection.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('collection.status')
        .getRawMany();

      const recentCollections = await this.dataCollectionRepository
        .createQueryBuilder('collection')
        .orderBy('collection.createdAt', 'DESC')
        .limit(10)
        .getMany();

      return {
        totalCollections,
        collectionsByType,
        collectionsByStatus,
        recentCollections
      };
    } catch (error) {
      this.logger.error(`Error generating data collection stats: ${error.message}`, error.stack);
      throw new Error(`Failed to generate data collection stats: ${error.message}`);
    }
  }

  async getWorkflowStats(): Promise<Record<string, any>> {
    try {
      this.logger.log('Generating workflow statistics');

      const totalWorkflows = await this.dataWorkflowRepository.count();
      const workflowsByType = await this.dataWorkflowRepository
        .createQueryBuilder('workflow')
        .select('workflow.workflowType', 'workflowType')
        .addSelect('COUNT(*)', 'count')
        .groupBy('workflow.workflowType')
        .getRawMany();

      const workflowsByStatus = await this.dataWorkflowRepository
        .createQueryBuilder('workflow')
        .select('workflow.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('workflow.status')
        .getRawMany();

      const recentWorkflows = await this.dataWorkflowRepository
        .createQueryBuilder('workflow')
        .orderBy('workflow.createdAt', 'DESC')
        .limit(10)
        .getMany();

      return {
        totalWorkflows,
        workflowsByType,
        workflowsByStatus,
        recentWorkflows
      };
    } catch (error) {
      this.logger.error(`Error generating workflow stats: ${error.message}`, error.stack);
      throw new Error(`Failed to generate workflow stats: ${error.message}`);
    }
  }

  // Data Quality and Privacy Monitoring

  async getDataQualityMetrics(): Promise<Record<string, any>> {
    try {
      this.logger.log('Calculating data quality metrics');

      const totalCollections = await this.dataCollectionRepository.count();
      const validCollections = await this.dataCollectionRepository.count({
        where: { status: DataStatus.VALIDATED }
      });
      const errorCollections = await this.dataCollectionRepository.count({
        where: { status: DataStatus.ERROR }
      });

      const completeness = totalCollections > 0 ? validCollections / totalCollections : 0;
      const errorRate = totalCollections > 0 ? errorCollections / totalCollections : 0;

      return {
        totalCollections,
        validCollections,
        errorCollections,
        completeness,
        errorRate,
        qualityScore: completeness * (1 - errorRate)
      };
    } catch (error) {
      this.logger.error(`Error calculating data quality metrics: ${error.message}`, error.stack);
      throw new Error(`Failed to calculate data quality metrics: ${error.message}`);
    }
  }

  async getPrivacyComplianceMetrics(): Promise<Record<string, any>> {
    try {
      this.logger.log('Calculating privacy compliance metrics');

      const totalCollections = await this.dataCollectionRepository.count();
      const anonymizedCollections = await this.dataCollectionRepository.count({
        where: { status: DataStatus.ANONYMIZED }
      });

      const collectionsWithConsent = await this.dataCollectionRepository
        .createQueryBuilder('collection')
        .where("collection.privacyMetadata->>'consentGiven' = 'true'")
        .getCount();

      const complianceRate = totalCollections > 0 ? anonymizedCollections / totalCollections : 0;
      const consentRate = totalCollections > 0 ? collectionsWithConsent / totalCollections : 0;

      return {
        totalCollections,
        anonymizedCollections,
        collectionsWithConsent,
        complianceRate,
        consentRate,
        privacyScore: (complianceRate + consentRate) / 2
      };
    } catch (error) {
      this.logger.error(`Error calculating privacy compliance metrics: ${error.message}`, error.stack);
      throw new Error(`Failed to calculate privacy compliance metrics: ${error.message}`);
    }
  }

  // Cleanup and Maintenance

  async cleanupExpiredData(retentionDays: number = 30): Promise<{
    deletedCollections: number;
    deletedWorkflows: number;
  }> {
    try {
      this.logger.log(`Cleaning up data older than ${retentionDays} days`);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Delete expired data collections
      const deletedCollections = await this.dataCollectionRepository
        .createQueryBuilder('collection')
        .delete()
        .where('collection.createdAt < :cutoffDate', { cutoffDate })
        .execute();

      // Delete expired workflows
      const deletedWorkflows = await this.dataWorkflowRepository
        .createQueryBuilder('workflow')
        .delete()
        .where('workflow.createdAt < :cutoffDate', { cutoffDate })
        .execute();

      this.logger.log(`Cleanup completed: ${deletedCollections.affected} collections, ${deletedWorkflows.affected} workflows deleted`);

      return {
        deletedCollections: deletedCollections.affected || 0,
        deletedWorkflows: deletedWorkflows.affected || 0
      };
    } catch (error) {
      this.logger.error(`Error during cleanup: ${error.message}`, error.stack);
      throw new Error(`Failed to cleanup expired data: ${error.message}`);
    }
  }

  async archiveCompletedWorkflows(): Promise<number> {
    try {
      this.logger.log('Archiving completed workflows');

      const completedWorkflows = await this.dataWorkflowRepository.find({
        where: { status: WorkflowStatus.COMPLETED }
      });

      // In a real implementation, you might move these to an archive table
      // For now, we'll just mark them as archived in the logs
      this.logger.log(`Found ${completedWorkflows.length} completed workflows to archive`);

      return completedWorkflows.length;
    } catch (error) {
      this.logger.error(`Error archiving completed workflows: ${error.message}`, error.stack);
      throw new Error(`Failed to archive completed workflows: ${error.message}`);
    }
  }
} 