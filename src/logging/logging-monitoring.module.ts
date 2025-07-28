import { Module, Global } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Log } from "./entities/log.entity"
import { LoggingMonitoringService } from "./services/logging-monitoring.service"
import { LoggingMonitoringController } from "./controllers/logging-monitoring.controller"
import { CustomLogger } from "./services/custom-logger.service"

@Global() // Make CustomLogger available globally
@Module({
  imports: [TypeOrmModule.forFeature([Log])],
  providers: [LoggingMonitoringService, CustomLogger],
  controllers: [LoggingMonitoringController],
  exports: [LoggingMonitoringService, CustomLogger], // Export services for use in other modules
})
export class LoggingMonitoringModule {}
