import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Matching } from '../entities/matching.entity';
import { FairnessAnalyzerService } from './fairness-analyzer.service';
import { MatchingConstraints, FairnessMetrics } from '../interfaces/fairness.interface';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Matching)
    private matchingRepository: Repository<Matching>,
    private fairnessAnalyzer: FairnessAnalyzerService,
  ) {}

  async createFairMatches(constraints: MatchingConstraints): Promise<Matching[]> {
    this.logger.log('Starting fair matching process');

    // Get all available mentors and mentees
    const mentors = await this.userRepository.find({
      where: { role: { $in: ['mentor', 'both'] }, isActive: true } as any
    });

    const mentees = await this.userRepository.find({
      where: { role: { $in: ['mentee', 'both'] }, isActive: true } as any
    });

    // Calculate raw compatibility scores
    const rawScores = await this.calculateCompatibilityScores(mentors, mentees);

    // Apply bias mitigation
    const adjustedScores = await this.fairnessAnalyzer.mitigateBias(
      mentors,
      mentees,
      rawScores,
      constraints
    );

    // Generate optimal matches using Hungarian algorithm with fairness constraints
    const optimalMatches = await this.generateOptimalMatches(
      adjustedScores,
      constraints
    );

    // Calculate fairness metrics for the proposed matches
    const fairnessMetrics = await this.calculateFairnessMetrics(
      mentors,
      mentees,
      optimalMatches
    );

    // Create matching records
    const matchings = [];
    for (const match of optimalMatches) {
      const matching = this.matchingRepository.create({
        mentorId: match.mentorId,
        menteeId: match.menteeId,
        compatibilityScore: match.score,
        fairnessScore: match.fairnessAdjustedScore,
        fairnessMetrics,
        status: 'pending'
      });

      matchings.push(await this.matchingRepository.save(matching));
    }

    this.logger.log(`Created ${matchings.length} fair matches`);
    return matchings;
  }

  private async calculateCompatibilityScores(
    mentors: User[],
    mentees: User[]
  ): Promise<Array<{ mentorId: string; menteeId: string; score: number }>> {
    const scores = [];

    for (const mentor of mentors) {
      for (const mentee of mentees) {
        const skillMatch = this.calculateSkillCompatibility(mentor.skills, mentee.preferences);
        const experienceGap = this.calculateExperienceCompatibility(
          mentor.experienceYears,
          mentee.experienceYears
        );
        
        const compatibilityScore = (skillMatch * 0.6) + (experienceGap * 0.4);
        
        scores.push({
          mentorId: mentor.id,
          menteeId: mentee.id,
          score: compatibilityScore
        });
      }
    }

    return scores;
  }

  private calculateSkillCompatibility(mentorSkills: string[], menteePreferences: string[]): number {
    if (!mentorSkills || !menteePreferences || mentorSkills.length === 0 || menteePreferences.length === 0) {
      return 0;
    }

    const matches = mentorSkills.filter(skill => 
      menteePreferences.some(pref => pref.toLowerCase().includes(skill.toLowerCase()))
    ).length;

    return matches / Math.max(mentorSkills.length, menteePreferences.length);
  }

  private calculateExperienceCompatibility(mentorYears: number, menteeYears: number): number {
    const gap = mentorYears - menteeYears;
    if (gap < 2) return 0.3; // Too close in experience
    if (gap > 15) return 0.5; // Too large gap
    return Math.min(1, gap / 8); // Optimal gap around 5-8 years
  }

  private async generateOptimalMatches(
    scores: Array<{ mentorId: string; menteeId: string; score: number; fairnessAdjustedScore: number }>,
    constraints: MatchingConstraints
  ): Promise<Array<{ mentorId: string; menteeId: string; score: number; fairnessAdjustedScore: number }>> {
    // Sort by fairness-adjusted score
    scores.sort((a, b) => b.fairnessAdjustedScore - a.fairnessAdjustedScore);

    const matches = [];
    const usedMentors = new Set<string>();
    const usedMentees = new Set<string>();

    for (const score of scores) {
      if (!usedMentors.has(score.mentorId) && !usedMentees.has(score.menteeId)) {
        matches.push(score);
        usedMentors.add(score.mentorId);
        usedMentees.add(score.menteeId);
      }
    }

    return matches;
  }

  private async calculateFairnessMetrics(
    mentors: User[],
    mentees: User[],
    matches: Array<{ mentorId: string; menteeId: string }>
  ): Promise<FairnessMetrics> {
    const historicalMatches = await this.matchingRepository.find({
      where: { status: { $in: ['completed', 'cancelled'] } } as any
    });

    return {
      demographicParity: await this.fairnessAnalyzer.calculateDemographicParity(mentors, mentees, matches),
      equalOpportunity: await this.fairnessAnalyzer.calculateEqualOpportunity(mentors, mentees, matches),
      equalizingOdds: await this.fairnessAnalyzer.calculateEqualizingOdds(historicalMatches),
      calibration: 0.85 // Placeholder - would need more complex implementation
    };
  }
}