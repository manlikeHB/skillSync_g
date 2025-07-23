import { Injectable } from '@nestjs/common';
import * as pidusage from 'pidusage';

@Injectable()
export class PerformanceMonitorService {
  async measureSystemPerformance<T>(
    operation: () => Promise<T>
  ): Promise<{ result: T; cpuUsage: number; memoryUsage: number; executionTime: number }> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    // Get initial CPU stats
    const initialStats = await pidusage(process.pid).catch(() => ({ cpu: 0 }));
    
    const result = await operation();
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;
    
    // Get final CPU stats
    const finalStats = await pidusage(process.pid).catch(() => ({ cpu: 0 }));
    
    return {
      result,
      cpuUsage: Math.max(finalStats.cpu - initialStats.cpu, 0),
      memoryUsage: endMemory - startMemory,
      executionTime: endTime - startTime
    };
  }

  async getSystemResources(): Promise<{
    totalMemory: number;
    freeMemory: number;
    cpuCount: number;
    loadAverage: number[];
  }> {
    const os = require('os');
    
    return {
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpuCount: os.cpus().length,
      loadAverage: os.loadavg()
    };
  }
}
