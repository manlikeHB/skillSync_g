import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { AdminService } from "./services/admin.service"
import { AdminController } from "./controllers/admin.controller"
import { MatchingProfile } from "../matching/entities/matching-profile.entity"
import { MatchingResultEntity } from "../matching/entities/matching-result.entity"
import { ManualMatch } from "../matching/entities/manual-match.entity"
import { Log } from "../logging-monitoring/entities/log.entity"
import { MatchingEngineService } from "../matching/services/matching-engine.service"
import { AdminMatchingService } from "../matching/services/admin-matching.service"
import { LoggingMonitoringService } from "../logging-monitoring/services/logging-monitoring.service"
import { CosineSimilarityAlgorithm } from "../matching/algorithms/cosine-similarity.algorithm"
import { EuclideanDistanceAlgorithm } from "../matching/algorithms/euclidean-distance.algorithm"
import { CustomLogger } from "../logging-monitoring/services/custom-logger.service"

@Module({
  imports: [TypeOrmModule.forFeature([MatchingProfile, MatchingResultEntity, ManualMatch, Log])],
  controllers: [AdminController],
  providers: [
    AdminService,
    // Re-provide services that AdminService depends on, as they are not globally exported
    // or if they are, it's good practice to explicitly list dependencies for clarity.
    MatchingEngineService,
    AdminMatchingService,
    LoggingMonitoringService,
    CosineSimilarityAlgorithm, // Required by MatchingEngineService
    EuclideanDistanceAlgorithm, // Required by MatchingEngineService
    CustomLogger, // Required by LoggingMonitoringService and AdminMatchingService
  ],
  exports: [AdminService],
})
export class AdminModule {}
