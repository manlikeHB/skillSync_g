import { BaseMatcher, MatchingResult } from './base-matcher';

export class HashMatcher extends BaseMatcher {
  name = 'Hash-based Matcher';

  async match(sourceData: any[], targetData: any[]): Promise<MatchingResult> {
    const { result, executionTime, memoryDelta } = this.measurePerformance(() => {
      const targetMap = new Map<string, any[]>();
      const matches: Array<{ source: any; target: any; score: number }> = [];
      
      // Build hash map for target data
      for (const target of targetData) {
        const hash = this.generateHash(target);
        if (!targetMap.has(hash)) {
          targetMap.set(hash, []);
        }
        targetMap.get(hash)!.push(target);
      }
      
      // Match source data using hash lookup
      for (const source of sourceData) {
        const sourceHash = this.generateHash(source);
        const candidates = targetMap.get(sourceHash) || [];
        
        for (const target of candidates) {
          const score = this.calculateDetailedSimilarity(source, target);
          if (score > 0.7) {
            matches.push({ source, target, score });
          }
        }
      }
      
      return matches.sort((a, b) => b.score - a.score);
    });

    return {
      matches: result,
      executionTime,
      memoryDelta
    };
  }

  private generateHash(obj: any): string {
    // Simple hash based on key fields
    const key = typeof obj === 'object' 
      ? `${obj.name || ''}_${obj.email || ''}_${obj.id || ''}`.toLowerCase()
      : String(obj).toLowerCase();
    
    // Generate a simple hash
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private calculateDetailedSimilarity(a: any, b: any): number {
    if (typeof a !== 'object' || typeof b !== 'object') {
      return a === b ? 1 : 0;
    }

    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    const allKeys = new Set([...aKeys, ...bKeys]);
    
    let matches = 0;
    for (const key of allKeys) {
      if (a[key] === b[key]) {
        matches++;
      } else if (typeof a[key] === 'string' && typeof b[key] === 'string') {
        const similarity = 1 - this.levenshteinDistance(a[key], b[key]) / Math.max(a[key].length, b[key].length);
        matches += similarity > 0.8 ? similarity : 0;
      }
    }
    
    return matches / allKeys.size;
  }

  private levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    
    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }
    
    return matrix[b.length][a.length];
  }
}
