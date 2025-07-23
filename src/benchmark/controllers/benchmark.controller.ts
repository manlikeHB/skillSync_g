import { Controller, Get, Post, Query } from '@nestjs/common';
import { BenchmarkService } from '../services/benchmark.service';
import { BenchmarkResult } from '../interfaces/benchmark.interface';

@Controller('benchmark')
export class BenchmarkController {
  constructor(private benchmarkService: BenchmarkService) {}

  @Post('run')
  async runBenchmark(): Promise<{
    results: BenchmarkResult[];
    summary: any;
    systemInfo: any;
  }> {
    return await this.benchmarkService.runComprehensiveBenchmark();
  }

  @Get('status')
  getStatus(): { status: string; timestamp: string } {
    return {
      status: 'ready',
      timestamp: new Date().toISOString()
    };
  }

  @Get('algorithms')
  getAvailableAlgorithms(): string[] {
    return ['Naive O(n²) Matcher', 'Hash-based Matcher', 'Bloom Filter Matcher'];
  }
}