import { BaseMatcher, MatchingResult } from './base-matcher';

export class BloomFilterMatcher extends BaseMatcher {
  name = 'Bloom Filter Matcher';
  private bloomFilter: Set<string>;
  private hashFunctions: Array<(str: string) => number>;

  constructor(private expectedElements = 10000, private falsePositiveRate = 0.01) {
    super();
    this.bloomFilter = new Set();
    this.hashFunctions = this.createHashFunctions();
  }

  async match(sourceData: any[], targetData: any[]): Promise<MatchingResult> {
    const { result, executionTime, memoryDelta } = this.measurePerformance(() => {
      // Build bloom filter for target data
      this.buildBloomFilter(targetData);
      
      const matches: Array<{ source: any; target: any; score: number }> = [];
      
      for (const source of sourceData) {
        if (this.mightContain(source)) {
          // Potential match found, verify with exact comparison
          for (const target of targetData) {
            const score = this.calculateSimilarity(source, target);
            if (score > 0.7) {
              matches.push({ source, target, score });
            }
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

  private createHashFunctions(): Array<(str: string) => number> {
    const optimalK = Math.ceil((this.expectedElements / this.expectedElements) * Math.log(2));
    const functions: Array<(str: string) => number> = [];
    
    for (let i = 0; i < Math.min(optimalK, 5); i++) {
      functions.push((str: string) => {
        let hash = 0;
        const seed = i + 1;
        for (let j = 0; j < str.length; j++) {
          hash = ((hash * seed) + str.charCodeAt(j)) % (this.expectedElements * 10);
        }
        return Math.abs(hash);
      });
    }
    
    return functions;
  }

  private buildBloomFilter(data: any[]): void {
    this.bloomFilter.clear();
    
    for (const item of data) {
      const key = this.extractKey(item);
      for (const hashFn of this.hashFunctions) {
        this.bloomFilter.add(hashFn(key).toString());
      }
    }
  }

  private mightContain(item: any): boolean {
    const key = this.extractKey(item);
    for (const hashFn of this.hashFunctions) {
      if (!this.bloomFilter.has(hashFn(key).toString())) {
        return false;
      }
    }
    return true;
  }

  private extractKey(obj: any): string {
    return typeof obj === 'object' 
      ? `${obj.name || ''}_${obj.email || ''}_${obj.id || ''}`.toLowerCase()
      : String(obj).toLowerCase();
  }

  private calculateSimilarity(a: any, b: any): number {
    const aStr = this.extractKey(a);
    const bStr = this.extractKey(b);
    
    if (aStr === bStr) return 1;
    
    const distance = this.levenshteinDistance(aStr, bStr);
    const maxLength = Math.max(aStr.length, bStr.length);
    return maxLength === 0 ? 1 : 1 - distance / maxLength;
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
