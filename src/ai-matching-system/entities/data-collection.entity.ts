import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { DataStatus } from '../enums/data-status.enum';
import { DataType } from '../enums/data-type.enum';

@Entity('data_collections')
@Index(['userId', 'dataType'])
@Index(['status'])
@Index(['createdAt'])
export class DataCollection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  userId: string;

  @Column({ type: 'enum', enum: DataType })
  dataType: DataType;

  @Column({ type: 'enum', enum: DataStatus, default: DataStatus.COLLECTED })
  status: DataStatus;

  @Column({ type: 'jsonb' })
  rawData: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  processedData: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  anonymizedData: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  validationResults: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    dataQuality: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  privacyMetadata: {
    anonymizationLevel: string;
    dataRetentionDays: number;
    consentGiven: boolean;
    consentDate: Date;
    dataCategories: string[];
  };

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  processingMetadata: {
    processingTime: number;
    algorithm: string;
    version: string;
    checksum: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 