import { Module } from '@nestjs/common';
import { BenchmarkController } from './controllers/benchmark.controller';
import { BenchmarkService } from './services/benchmark.service';
import { DataGeneratorService } from './data/data-generator.service';
import { PerformanceMonitorService } from './services/performance-monitor.service';

@Module({
  controllers: [BenchmarkController],
  providers: [
    BenchmarkService,
    DataGeneratorService,
    PerformanceMonitorService
  ],
  exports: [BenchmarkService]
})
export class BenchmarkModule {}
