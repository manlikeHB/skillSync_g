import { Injectable } from '@nestjs/common';
import { BenchmarkResult, DataProfile } from '../interfaces/benchmark.interface';
import { DataGeneratorService } from '../data/data-generator.service';
import { PerformanceMonitorService } from './performance-monitor.service';
import { BaseMatcher } from '../algorithms/base-matcher';
import { NaiveMatcher } from '../algorithms/naive-matcher';
import { HashMatcher } from '../algorithms/hash-matcher';
import { BloomFilterMatcher } from '../algorithms/bloom-filter-matcher';

@Injectable()
export class BenchmarkService {
  private matchers: BaseMatcher[] = [
    new NaiveMatcher(),
    new HashMatcher(),
    new BloomFilterMatcher()
  ];

  constructor(
    private dataGenerator: DataGeneratorService,
    private performanceMonitor: PerformanceMonitorService
  ) {}

  async runComprehensiveBenchmark(): Promise<{
    results: BenchmarkResult[];
    summary: any;
    systemInfo: any;
  }> {
    console.log('Starting comprehensive benchmark...');
    
    const profiles: DataProfile[] = [
      { size: 100, complexity: 'low', duplicateRate: 0.2, noiseLevel: 0.1 },
      { size: 500, complexity: 'low', duplicateRate: 0.2, noiseLevel: 0.1 },
      { size: 1000, complexity: 'medium', duplicateRate: 0.3, noiseLevel: 0.15 },
      { size: 2000, complexity: 'medium', duplicateRate: 0.3, noiseLevel: 0.15 },
      { size: 5000, complexity: 'high', duplicateRate: 0.4, noiseLevel: 0.2 }
    ];

    const results: BenchmarkResult[] = [];
    const systemInfo = await this.performanceMonitor.getSystemResources();

    for (const profile of profiles) {
      console.log(`Testing with data size: ${profile.size}, complexity: ${profile.complexity}`);
      
      const testData = this.dataGenerator.generateTestData(profile);
      
      for (const matcher of this.matchers) {
        console.log(`  Running ${matcher.name}...`);
        
        const benchmarkResult = await this.benchmarkMatcher(matcher, testData, profile);
        results.push(benchmarkResult);
        
        // Add delay to prevent system overload
        await this.delay(1000);
      }
    }

    const summary = this.generateSummary(results);
    
    return { results, summary, systemInfo };
  }

  private async benchmarkMatcher(
    matcher: BaseMatcher,
    testData: { source: any[]; target: any[] },
    profile: DataProfile
  ): Promise<BenchmarkResult> {
    const { result: matchResult, cpuUsage, memoryUsage, executionTime } = 
      await this.performanceMonitor.measureSystemPerformance(async () => {
        return await matcher.match(testData.source, testData.target);
      });

    // Calculate accuracy (simplified - in real world, you'd have ground truth)
    const accuracy = this.calculateAccuracy(matchResult.matches, testData, profile);
    
    // Calculate throughput
    const totalRecords = testData.source.length + testData.target.length;
    const throughput = totalRecords / (executionTime / 1000); // records per second

    return {
      algorithmName: matcher.name,
      dataSize: profile.size,
      executionTime,
      memoryUsage,
      cpuUsage,
      accuracy,
      throughput
    };
  }

  private calculateAccuracy(matches: any[], testData: { source: any[]; target: any[] }, profile: DataProfile): number {
    // Simplified accuracy calculation
    // In a real scenario, you'd compare against known ground truth
    const expectedMatches = Math.floor(testData.source.length * profile.duplicateRate);
    const actualMatches = matches.length;
    
    // Simple accuracy estimation based on match count and quality
    const countAccuracy = Math.min(actualMatches / expectedMatches, 1);
    const qualityScore = matches.reduce((sum, match) => sum + match.score, 0) / Math.max(matches.length, 1);
    
    return (countAccuracy * 0.6 + qualityScore * 0.4) * 100;
  }

  private generateSummary(results: BenchmarkResult[]): any {
    const algorithmStats = new Map<string, {
      avgExecutionTime: number;
      avgMemoryUsage: number;
      avgCpuUsage: number;
      avgAccuracy: number;
      avgThroughput: number;
      scalability: number;
    }>();

    // Group results by algorithm
    const algorithmGroups = new Map<string, BenchmarkResult[]>();
    for (const result of results) {
      if (!algorithmGroups.has(result.algorithmName)) {
        algorithmGroups.set(result.algorithmName, []);
      }
      algorithmGroups.get(result.algorithmName)!.push(result);
    }

    // Calculate statistics for each algorithm
    for (const [algorithm, algorithmResults] of algorithmGroups) {
      const stats = {
        avgExecutionTime: this.average(algorithmResults.map(r => r.executionTime)),
        avgMemoryUsage: this.average(algorithmResults.map(r => r.memoryUsage)),
        avgCpuUsage: this.average(algorithmResults.map(r => r.cpuUsage)),
        avgAccuracy: this.average(algorithmResults.map(r => r.accuracy)),
        avgThroughput: this.average(algorithmResults.map(r => r.throughput)),
        scalability: this.calculateScalability(algorithmResults)
      };
      
      algorithmStats.set(algorithm, stats);
    }

    // Find best performers
    const bestPerformers = {
      fastest: this.findBest(results, 'executionTime', false),
      mostMemoryEfficient: this.findBest(results, 'memoryUsage', false),
      mostAccurate: this.findBest(results, 'accuracy', true),
      highestThroughput: this.findBest(results, 'throughput', true)
    };

    return {
      algorithmStats: Object.fromEntries(algorithmStats),
      bestPerformers,
      recommendations: this.generateRecommendations(algorithmStats)
    };
  }

  private average(numbers: number[]): number {
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  private calculateScalability(results: BenchmarkResult[]): number {
    if (results.length < 2) return 0;
    
    // Sort by data size
    results.sort((a, b) => a.dataSize - b.dataSize);
    
    // Calculate how execution time scales with data size
    const firstResult = results[0];
    const lastResult = results[results.length - 1];
    
    const sizeRatio = lastResult.dataSize / firstResult.dataSize;
    const timeRatio = lastResult.executionTime / firstResult.executionTime;
    
    // Lower scalability score means better scaling (closer to linear)
    return timeRatio / sizeRatio;
  }

  private findBest(results: BenchmarkResult[], metric: keyof BenchmarkResult, higher: boolean): BenchmarkResult {
    return results.reduce((best, current) => {
      const currentValue = current[metric] as number;
      const bestValue = best[metric] as number;
      
      return (higher ? currentValue > bestValue : currentValue < bestValue) ? current : best;
    });
  }

  private generateRecommendations(algorithmStats: Map<string, any>): string[] {
    const recommendations: string[] = [];
    
    const algorithms = Array.from(algorithmStats.entries());
    
    // Find fastest algorithm
    const fastest = algorithms.reduce((best, current) => 
      current[1].avgExecutionTime < best[1].avgExecutionTime ? current : best
    );
    recommendations.push(`For speed: Use ${fastest[0]} (avg: ${fastest[1].avgExecutionTime.toFixed(2)}ms)`);
    
    // Find most memory efficient
    const mostEfficient = algorithms.reduce((best, current) => 
      current[1].avgMemoryUsage < best[1].avgMemoryUsage ? current : best
    );
    recommendations.push(`For memory efficiency: Use ${mostEfficient[0]} (avg: ${(mostEfficient[1].avgMemoryUsage / 1024 / 1024).toFixed(2)}MB)`);
    
    // Find most accurate
    const mostAccurate = algorithms.reduce((best, current) => 
      current[1].avgAccuracy > best[1].avgAccuracy ? current : best
    );
    recommendations.push(`For accuracy: Use ${mostAccurate[0]} (avg: ${mostAccurate[1].avgAccuracy.toFixed(2)}%)`);
    
    // Find best scaling
    const bestScaling = algorithms.reduce((best, current) => 
      current[1].scalability < best[1].scalability ? current : best
    );
    recommendations.push(`For large datasets: Use ${bestScaling[0]} (scalability factor: ${bestScaling[1].scalability.toFixed(2)})`);
    
    return recommendations;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
