import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { MatchingValidationService } from "./services/matching-validation.service"
import { MatchingValidationController } from "./controllers/matching-validation.controller"
import { MatchingEngineService } from "../matching/services/matching-engine.service"
import { CustomLogger } from "../logging-monitoring/services/custom-logger.service"
import { CosineSimilarityAlgorithm } from "../matching/algorithms/cosine-similarity.algorithm"
import { EuclideanDistanceAlgorithm } from "../matching/algorithms/euclidean-distance.algorithm"
import { MatchingProfile } from "../matching/entities/matching-profile.entity" // Needed to fetch profiles for validation

@Module({
  imports: [TypeOrmModule.forFeature([MatchingProfile])], // Only need MatchingProfile for validation
  controllers: [MatchingValidationController],
  providers: [
    MatchingValidationService,
    // Provide dependencies required by MatchingValidationService
    MatchingEngineService,
    CustomLogger,
    CosineSimilarityAlgorithm, // Required by MatchingEngineService
    EuclideanDistanceAlgorithm, // Required by MatchingEngineService
  ],
  exports: [MatchingValidationService],
})
export class MatchingValidationModule {}
