export abstract class BaseMatcher {
    abstract name: string;
    
    abstract match(sourceData: any[], targetData: any[]): Promise<MatchingResult>;
    
    protected measurePerformance<T>(fn: () => T): { result: T; executionTime: number; memoryDelta: number } {
      const startMemory = process.memoryUsage().heapUsed;
      const startTime = performance.now();
      
      const result = fn();
      
      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;
      
      return {
        result,
        executionTime: endTime - startTime,
        memoryDelta: endMemory - startMemory
      };
    }
  }