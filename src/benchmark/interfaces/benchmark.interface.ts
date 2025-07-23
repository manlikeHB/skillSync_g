export interface BenchmarkResult {
    algorithmName: string;
    dataSize: number;
    executionTime: number; // milliseconds
    memoryUsage: number; // bytes
    cpuUsage: number; // percentage
    accuracy: number; // percentage
    throughput: number; // operations per second
  }
  
  export interface MatchingResult {
    matches: Array<{ source: any; target: any; score: number }>;
    executionTime: number;
    memoryDelta: number;
  }
  
  export interface DataProfile {
    size: number;
    complexity: 'low' | 'medium' | 'high';
    duplicateRate: number;
    noiseLevel: number;
  }
  