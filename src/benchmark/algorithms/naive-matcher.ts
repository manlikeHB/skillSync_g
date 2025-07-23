import { BaseMatcher, MatchingResult } from './base-matcher';

export class NaiveMatcher extends BaseMatcher {
  name = 'Naive O(n²) Matcher';

  async match(sourceData: any[], targetData: any[]): Promise<MatchingResult> {
    const { result, executionTime, memoryDelta } = this.measurePerformance(() => {
      const matches: Array<{ source: any; target: any; score: number }> = [];
      
      for (const source of sourceData) {
        for (const target of targetData) {
          const score = this.calculateSimilarity(source, target);
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

  private calculateSimilarity(a: any, b: any): number {
    const aStr = JSON.stringify(a).toLowerCase();
    const bStr = JSON.stringify(b).toLowerCase();
    
    // Simple Levenshtein distance-based similarity
    const distance = this.levenshteinDistance(aStr, bStr);
    const maxLength = Math.max(aStr.length, bStr.length);
    return maxLength === 0 ? 1 : 1 - distance / maxLength;
  }

  private levenshteinDistance(a: string, b: string): number {
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
