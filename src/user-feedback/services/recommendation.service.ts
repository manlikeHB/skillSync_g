import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Match } from '../entities/match.entity';
import { Feedback } from '../entities/feedback.entity';
import { FeedbackService } from './feedback.service';

interface MatchRecommendation {
  mentorId: string;
  menteeId: string;
  score: number;
  reasons: string[];
  confidence: number;
}

@Injectable()
export class RecommendationService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
    private feedbackService: FeedbackService,
  ) {}

  async generateRecommendations(userId: string, limit: number = 10): Promise<MatchRecommendation[]> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    // Get potential matches based on user role
    const potentialMatches = await this.getPotentialMatches(user);
    
    // Score each potential match
    const scoredMatches = await Promise.all(
      potentialMatches.map(async (candidate) => {
        const score = await this.calculateMatchScore(user, candidate);
        return {
          ...score,
          mentorId: user.role === 'mentor' ? user.id : candidate.id,
          menteeId: user.role === 'mentee' ? user.id : candidate.id,
        };
      })
    );

    // Sort by score and return top matches
    return scoredMatches
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private async getPotentialMatches(user: User): Promise<User[]> {
    const oppositeRole = user.role === 'mentor' ? 'mentee' : 'mentor';
    
    return this.userRepository.find({
      where: { role: oppositeRole },
    });
  }

  private async calculateMatchScore(user1: User, user2: User): Promise<{
    score: number;
    reasons: string[];
    confidence: number;
  }> {
    let score = 0;
    const reasons: string[] = [];
    
    // Base compatibility score (40% of total)
    const compatibilityScore = this.calculateCompatibilityScore(user1, user2);
    score += compatibilityScore * 0.4;
    
    if (compatibilityScore > 0.7) reasons.push('High skill compatibility');
    
    // Historical feedback integration (60% of total)
    const feedbackScore = await this.calculateFeedbackBasedScore(user1, user2);
    score += feedbackScore * 0.6;
    
    if (feedbackScore > 0.8) reasons.push('Strong historical feedback patterns');
    
    // Calculate confidence based on available data
    const confidence = await this.calculateConfidence(user1, user2);
    
    return { score, reasons, confidence };
  }

  private calculateCompatibilityScore(user1: User, user2: User): number {
    let score = 0;
    
    // Skills overlap
    const skillsOverlap = this.calculateOverlap(user1.skills || [], user2.skills || []);
    score += skillsOverlap * 0.4;
    
    // Interests overlap
    const interestsOverlap = this.calculateOverlap(user1.interests || [], user2.interests || []);
    score += interestsOverlap * 0.3;
    
    // Preferences compatibility
    const preferencesScore = this.calculatePreferencesCompatibility(user1.preferences, user2.preferences);
    score += preferencesScore * 0.3;
    
    return Math.min(score, 1.0);
  }

  private async calculateFeedbackBasedScore(user1: User, user2: User): Promise<number> {
    // Get historical matches and feedback for both users
    const user1Matches = await this.getUserMatches(user1.id);
    const user2Matches = await this.getUserMatches(user2.id);
    
    // Analyze patterns from successful matches
    const user1SuccessPatterns = await this.analyzeSuccessPatterns(user1Matches);
    const user2SuccessPatterns = await this.analyzeSuccessPatterns(user2Matches);
    
    // Calculate how well user2 matches user1's success patterns and vice versa
    const user1Score = this.matchesSuccessPattern(user2, user1SuccessPatterns);
    const user2Score = this.matchesSuccessPattern(user1, user2SuccessPatterns);
    
    return (user1Score + user2Score) / 2;
  }

  private async getUserMatches(userId: string): Promise<Match[]> {
    return this.matchRepository.find({
      where: [
        { mentorId: userId },
        { menteeId: userId },
      ],
      relations: ['feedback', 'mentor', 'mentee'],
    });
  }

  private async analyzeSuccessPatterns(matches: Match[]): Promise<{
    averageRating: number;
    successfulSkills: string[];
    successfulPreferences: any;
    commonSuccessFactors: string[];
  }> {
    const successfulMatches = matches.filter(match => {
      const avgRating = match.feedback.length > 0 
        ? match.feedback.reduce((sum, f) => sum + f.rating, 0) / match.feedback.length
        : 0;
      return avgRating >= 4.0;
    });

    if (successfulMatches.length === 0) {
      return {
        averageRating: 0,
        successfulSkills: [],
        successfulPreferences: {},
        commonSuccessFactors: [],
      };
    }

    // Extract patterns from successful matches
    const skillPatterns = successfulMatches.flatMap(match => {
      const partner = match.mentor.id !== match.mentorId ? match.mentor : match.mentee;
      return partner.skills || [];
    });

    const commonSuccessFactors = await this.extractSuccessFactors(successfulMatches);

    return {
      averageRating: successfulMatches.reduce((sum, match) => {
        const avgRating = match.feedback.length > 0 
          ? match.feedback.reduce((sum, f) => sum + f.rating, 0) / match.feedback.length
          : 0;
        return sum + avgRating;
      }, 0) / successfulMatches.length,
      successfulSkills: [...new Set(skillPatterns)],
      successfulPreferences: {},
      commonSuccessFactors,
    };
  }

  private async extractSuccessFactors(matches: Match[]): Promise<string[]> {
    const factors: string[] = [];
    
    for (const match of matches) {
      const feedback = match.feedback;
      
      // Extract common tags from high-rated feedback
      const highRatedFeedback = feedback.filter(f => f.rating >= 4);
      const tags = highRatedFeedback.flatMap(f => f.tags || []);
      factors.push(...tags);
      
      // Analyze specific feedback
      highRatedFeedback.forEach(f => {
        if (f.specificFeedback?.skillsMatched) factors.push('skills_matched');
        if (f.specificFeedback?.communicationEffective) factors.push('good_communication');
        if (f.specificFeedback?.goalsAligned) factors.push('aligned_goals');
      });
    }
    
    return [...new Set(factors)];
  }

  private matchesSuccessPattern(user: User, patterns: any): number {
    let score = 0;
    let factors = 0;
    
    // Check skill alignment with successful patterns
    if (patterns.successfulSkills.length > 0) {
      const skillMatch = this.calculateOverlap(user.skills || [], patterns.successfulSkills);
      score += skillMatch;
      factors++;
    }
    
    return factors > 0 ? score / factors : 0.5; // Default neutral score
  }

  private calculateOverlap(arr1: string[], arr2: string[]): number {
    if (arr1.length === 0 || arr2.length === 0) return 0;
    
    const set1 = new Set(arr1.map(s => s.toLowerCase()));
    const set2 = new Set(arr2.map(s => s.toLowerCase()));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  private calculatePreferencesCompatibility(pref1: any, pref2: any): number {
    if (!pref1 || !pref2) return 0.5;
    
    let score = 0;
    let factors = 0;
    
    // Communication style compatibility
    if (pref1.communicationStyle && pref2.communicationStyle) {
      score += pref1.communicationStyle === pref2.communicationStyle ? 1 : 0.3;
      factors++;
    }
    
    // Meeting frequency compatibility
    if (pref1.meetingFrequency && pref2.meetingFrequency) {
      score += pref1.meetingFrequency === pref2.meetingFrequency ? 1 : 0.5;
      factors++;
    }
    
    // Time zone compatibility
    if (pref1.timeZone && pref2.timeZone) {
      score += pref1.timeZone === pref2.timeZone ? 1 : 0.2;
      factors++;
    }
    
    return factors > 0 ? score / factors : 0.5;
  }

  private async calculateConfidence(user1: User, user2: User): Promise<number> {
    // Confidence based on historical data availability
    const user1History = await this.getUserMatches(user1.id);
    const user2History = await this.getUserMatches(user2.id);
    
    const totalHistory = user1History.length + user2History.length;
    const feedbackCount = user1History.reduce((sum, m) => sum + m.feedback.length, 0) +
                         user2History.reduce((sum, m) => sum + m.feedback.length, 0);
    
    // Higher confidence with more historical data
    let confidence = Math.min((totalHistory * 0.1) + (feedbackCount * 0.05), 1.0);
    
    // Minimum confidence threshold
    return Math.max(confidence, 0.3);
  }
}