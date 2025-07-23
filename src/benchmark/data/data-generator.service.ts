import { Injectable } from '@nestjs/common';
import { DataProfile } from '../interfaces/benchmark.interface';

@Injectable()
export class DataGeneratorService {
  generateTestData(profile: DataProfile): { source: any[]; target: any[] } {
    const source = this.generateDataSet(profile.size, profile);
    const target = this.generateRelatedDataSet(source, profile);
    
    return { source, target };
  }

  private generateDataSet(size: number, profile: DataProfile): any[] {
    const data: any[] = [];
    const firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'company.com'];
    
    for (let i = 0; i < size; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const domain = domains[Math.floor(Math.random() * domains.length)];
      
      const record = {
        id: i + 1,
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
        age: Math.floor(Math.random() * 50) + 20,
        department: this.getRandomDepartment(),
        salary: Math.floor(Math.random() * 100000) + 30000,
        metadata: profile.complexity === 'high' ? this.generateComplexMetadata() : {}
      };
      
      // Add noise based on noise level
      if (Math.random() < profile.noiseLevel) {
        record.name = this.addNoise(record.name);
        record.email = this.addNoise(record.email);
      }
      
      data.push(record);
    }
    
    return data;
  }

  private generateRelatedDataSet(sourceData: any[], profile: DataProfile): any[] {
    const targetData: any[] = [];
    
    // Create exact duplicates based on duplicate rate
    const duplicateCount = Math.floor(sourceData.length * profile.duplicateRate);
    for (let i = 0; i < duplicateCount; i++) {
      const original = sourceData[Math.floor(Math.random() * sourceData.length)];
      targetData.push({ ...original, id: targetData.length + 10000 });
    }
    
    // Create similar records with variations
    const similarCount = Math.floor(sourceData.length * 0.3);
    for (let i = 0; i < similarCount; i++) {
      const original = sourceData[Math.floor(Math.random() * sourceData.length)];
      const similar = { ...original };
      similar.id = targetData.length + 10000;
      
      // Add variations
      if (Math.random() < 0.5) {
        similar.age += Math.floor(Math.random() * 3) - 1; // ±1 year
      }
      if (Math.random() < 0.3) {
        similar.salary += Math.floor(Math.random() * 10000) - 5000; // ±5k
      }
      
      targetData.push(similar);
    }
    
    // Fill remaining with random data
    const remainingCount = sourceData.length - targetData.length;
    const randomData = this.generateDataSet(remainingCount, profile);
    targetData.push(...randomData.map(item => ({ ...item, id: item.id + 20000 })));
    
    return targetData;
  }

  private getRandomDepartment(): string {
    const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Legal'];
    return departments[Math.floor(Math.random() * departments.length)];
  }

  private generateComplexMetadata(): any {
    return {
      preferences: {
        theme: Math.random() > 0.5 ? 'dark' : 'light',
        notifications: Math.random() > 0.3,
        language: ['en', 'es', 'fr', 'de'][Math.floor(Math.random() * 4)]
      },
      history: Array.from({ length: 5 }, (_, i) => ({
        action: `action_${i}`,
        timestamp: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
        metadata: { key: `value_${i}` }
      })),
      tags: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, 
        (_, i) => `tag_${i}_${Math.random().toString(36).substr(2, 5)}`)
    };
  }

  private addNoise(text: string): string {
    if (Math.random() < 0.5) {
      // Character substitution
      const chars = text.split('');
      const randomIndex = Math.floor(Math.random() * chars.length);
      chars[randomIndex] = String.fromCharCode(chars[randomIndex].charCodeAt(0) + 1);
      return chars.join('');
    } else if (Math.random() < 0.5) {
      // Character deletion
      const randomIndex = Math.floor(Math.random() * text.length);
      return text.slice(0, randomIndex) + text.slice(randomIndex + 1);
    } else {
      // Character insertion
      const randomIndex = Math.floor(Math.random() * text.length);
      const randomChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
      return text.slice(0, randomIndex) + randomChar + text.slice(randomIndex);
    }
  }
}