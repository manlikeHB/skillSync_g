import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiMatchingController } from './controllers/ai-matching.controller';
import { DataCollectionService } from './services/data-collection.service';
import { DataValidationService } from './services/data-validation.service';
import { DataPreprocessingService } from './services/data-preprocessing.service';
import { DataAnonymizationService } from './services/data-anonymization.service';
import { DataCollection, DataWorkflow } from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([DataCollection, DataWorkflow])
  ],
  controllers: [AiMatchingController],
  providers: [
    DataCollectionService,
    DataValidationService,
    DataPreprocessingService,
    DataAnonymizationService
  ],
  exports: [
    DataCollectionService,
    DataValidationService,
    DataPreprocessingService,
    DataAnonymizationService
  ]
})
export class AiMatchingSystemModule {} 