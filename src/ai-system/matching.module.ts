import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { MatchingProfile } from "./entities/matching-profile.entity"
import { MatchingResultEntity } from "./entities/matching-result.entity"
import { ManualMatch } from "./entities/manual-match.entity" // Import new entity
import { MatchingEngineService } from "./services/matching-engine.service"
import { AdminMatchingService } from "./services/admin-matching.service" // Import new service
import { MatchingController } from "./controllers/matching.controller"
import { AdminMatchingController } from "./controllers/admin-matching.controller" // Import new controller
import { CosineSimilarityAlgorithm } from "./algorithms/cosine-similarity.algorithm"
import { EuclideanDistanceAlgorithm } from "./algorithms/euclidean-distance.algorithm"
import { CustomLogger } from "../logging-monitoring/services/custom-logger.service" // Ensure CustomLogger is imported

@Module({
  imports: [TypeOrmModule.forFeature([MatchingProfile, MatchingResultEntity, ManualMatch])], // Add ManualMatch
  controllers: [MatchingController, AdminMatchingController], // Add AdminMatchingController
  providers: [
    MatchingEngineService,
    AdminMatchingService, // Add AdminMatchingService
    CosineSimilarityAlgorithm,
    EuclideanDistanceAlgorithm,
    CustomLogger, // Ensure CustomLogger is provided here if not global
  ],
  exports: [MatchingEngineService, AdminMatchingService], // Export AdminMatchingService
})
export class MatchingModule {}
