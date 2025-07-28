import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Matching } from '../entities/matching.entity';
import { FairnessMetrics, DemographicInfo, MatchingConstraints } from '../interfaces/fairness.interface';

@Injectable()
export class FairnessAnalyzerService {
  private readonly logger = new Logger(FairnessAnalyzerService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Matching)
    private matchingRepository: Repository<Matching>,
  ) {}

  /**
   * Calculate demographic parity - ensures equal representation across demographic groups
   */
  async calculateDemographicParity(
    mentors: User[],
    mentees: User[],
    proposedMatches: Array<{ mentorId: string; menteeId: string }>
  ): Promise<number> {
    const demographicGroups = this.groupByDemographics(mentors.concat(mentees));
    const matchCounts = new Map<string, number>();
    
    // Count matches per demographic group
    for (const match of proposedMatches) {
      const mentor = mentors.find(m => m.id === match.mentorId);
      const mentee = mentees.find(m => m.id === match.menteeId);
      
      if (mentor && mentee) {
        const mentorGroup = this.getDemographicKey(mentor.demographicInfo);
        const menteeGroup = this.getDemographicKey(mentee.demographicInfo);
        
        matchCounts.set(mentorGroup, (matchCounts.get(mentorGroup) || 0) + 1);
        matchCounts.set(menteeGroup, (matchCounts.get(menteeGroup) || 0) + 1);
      }
    }

    // Calculate parity score (1 = perfect parity, 0 = maximum disparity)
    const expectedMatchesPerGroup = proposedMatches.length * 2 / demographicGroups.size;
    let disparitySum = 0;

    for (const [group, count] of matchCounts) {
      const disparity = Math.abs(count - expectedMatchesPerGroup) / expectedMatchesPerGroup;
      disparitySum += disparity;
    }

    return Math.max(0, 1 - disparitySum / demographicGroups.size);
  }

  /**
   * Calculate equal opportunity - ensures equal matching rates across groups
   */
  async calculateEqualOpportunity(
    mentors: User[],
    mentees: User[],
    proposedMatches: Array<{ mentorId: string; menteeId: string }>
  ): Promise<number> {
    const demographicGroups = this.groupByDemographics(mentees);
    const matchRates = new Map<string, number>();

    for (const [groupKey, groupMembers] of demographicGroups) {
      const groupMatches = proposedMatches.filter(match => 
        groupMembers.some(member => member.id === match.menteeId)
      );
      
      const matchRate = groupMembers.length > 0 ? groupMatches.length / groupMembers.length : 0;
      matchRates.set(groupKey, matchRate);
    }

    // Calculate equal opportunity score
    const rates = Array.from(matchRates.values());
    if (rates.length === 0) return 1;

    const avgRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    const variance = rates.reduce((sum, rate) => sum + Math.pow(rate - avgRate, 2), 0) / rates.length;
    
    return Math.max(0, 1 - Math.sqrt(variance));
  }

  /**
   * Calculate equalizing odds - ensures equal true/false positive rates
   */
  async calculateEqualizingOdds(historicalMatches: Matching[]): Promise<number> {
    if (historicalMatches.length === 0) return 1;

    const mentors = await this.userRepository.find({
      where: { id: { $in: historicalMatches.map(m => m.mentorId) } as any }
    });
    
    const mentees = await this.userRepository.find({
      where: { id: { $in: historicalMatches.map(m => m.menteeId) } as any }
    });

    const demographicGroups = this.groupByDemographics(mentees);
    const groupRates = new Map<string, { tpr: number; fpr: number }>();

    for (const [groupKey, groupMembers] of demographicGroups) {
      const groupMatches = historicalMatches.filter(match =>
        groupMembers.some(member => member.id === match.menteeId)
      );

      const successfulMatches = groupMatches.filter(m => m.status === 'completed');
      const failedMatches = groupMatches.filter(m => m.status === 'cancelled');

      const tpr = groupMatches.length > 0 ? successfulMatches.length / groupMatches.length : 0;
      const fpr = groupMatches.length > 0 ? failedMatches.length / groupMatches.length : 0;

      groupRates.set(groupKey, { tpr, fpr });
    }

    // Calculate equalizing odds score
    const tprs = Array.from(groupRates.values()).map(r => r.tpr);
    const fprs = Array.from(groupRates.values()).map(r => r.fpr);

    const tprVariance = this.calculateVariance(tprs);
    const fprVariance = this.calculateVariance(fprs);

    return Math.max(0, 1 - (Math.sqrt(tprVariance) + Math.sqrt(fprVariance)) / 2);
  }

  /**
   * Apply bias mitigation techniques to matching scores
   */
  async mitigateBias(
    mentors: User[],
    mentees: User[],
    rawScores: Array<{ mentorId: string; menteeId: string; score: number }>,
    constraints: MatchingConstraints
  ): Promise<Array<{ mentorId: string; menteeId: string; score: number; fairnessAdjustedScore: number }>> {
    const adjustedScores = [];

    for (const rawScore of rawScores) {
      const mentor = mentors.find(m => m.id === rawScore.mentorId);
      const mentee = mentees.find(m => m.id === rawScore.menteeId);

      if (!mentor || !mentee) continue;

      // Apply demographic fairness adjustment
      const demographicPenalty = this.calculateDemographicPenalty(
        mentor.demographicInfo,
        mentee.demographicInfo,
        constraints
      );

      // Apply diversity bonus
      const diversityBonus = this.calculateDiversityBonus(
        mentor.demographicInfo,
        mentee.demographicInfo,
        constraints.diversityWeight
      );

      // Combine original score with fairness adjustments
      const fairnessAdjustedScore = rawScore.score * (1 - demographicPenalty) + diversityBonus;

      adjustedScores.push({
        ...rawScore,
        fairnessAdjustedScore: Math.max(0, Math.min(1, fairnessAdjustedScore))
      });
    }

    return adjustedScores;
  }

  private groupByDemographics(users: User[]): Map<string, User[]> {
    const groups = new Map<string, User[]>();

    for (const user of users) {
      const key = this.getDemographicKey(user.demographicInfo);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(user);
    }

    return groups;
  }

  private getDemographicKey(demo: DemographicInfo): string {
    return `${demo?.gender || 'unknown'}_${demo?.ethnicity || 'unknown'}_${demo?.experienceLevel || 'unknown'}`;
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  private calculateDemographicPenalty(
    mentorDemo: DemographicInfo,
    menteeDemo: DemographicInfo,
    constraints: MatchingConstraints
  ): number {
    // Penalize matches that contribute to demographic imbalance
    const similarity = this.calculateDemographicSimilarity(mentorDemo, menteeDemo);
    return similarity > (1 - constraints.maxDemographicImbalance) ? 0.1 : 0;
  }

  private calculateDiversityBonus(
    mentorDemo: DemographicInfo,
    menteeDemo: DemographicInfo,
    diversityWeight: number
  ): number {
    // Bonus for cross-demographic matches
    const diversity = 1 - this.calculateDemographicSimilarity(mentorDemo, menteeDemo);
    return diversity * diversityWeight * 0.2;
  }

  private calculateDemographicSimilarity(demo1: DemographicInfo, demo2: DemographicInfo): number {
    let matches = 0;
    let total = 0;

    const attributes = ['gender', 'ethnicity', 'experienceLevel'];
    
    for (const attr of attributes) {
      if (demo1[attr] && demo2[attr]) {
        total++;
        if (demo1[attr] === demo2[attr]) matches++;
      }
    }

    return total > 0 ? matches / total : 0;
  }
}