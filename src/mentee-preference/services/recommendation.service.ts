import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { MenteePreference, PreferenceType } from '../entities/mentee-preference.entity';
import { RecommendationRequestDto, RecommendationResponseDto } from '../dto/recommendation.dto';

interface MatchScore {
  mentorId: string;
  skillsMatch: number;
  interestsMatch: number;
  preferenceBoost: number;
  totalScore: number;
  matchReasons: string[];
}

@Injectable()
export class RecommendationService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(MenteePreference)
    private preferenceRepository: Repository<MenteePreference>
  ) {}

  async getRecommendations(menteeId: string, dto: RecommendationRequestDto): Promise<RecommendationResponseDto[]> {
    // Get mentee details
    const mentee = await this.userRepository.findOne({ where: { id: menteeId } });
    if (!mentee) {
      throw new Error('Mentee not found');
    }

    // Get all available mentors
    const mentors = await this.userRepository.find({
      where: [
        { role: UserRole.MENTOR, isActive: true },
        { role: UserRole.BOTH, isActive: true }
      ]
    });

    // Get mentee preferences
    const preferences = await this.preferenceRepository.find({
      where: { menteeId }
    });
    const preferenceMap = new Map(preferences.map(p => [p.preferredMentorId, p]));

    // Calculate match scores
    const scores = mentors.map(mentor => this.calculateMatchScore(
      mentee,
      mentor,
      dto,
      preferenceMap.get(mentor.id)
    )).filter(score => score.totalScore > 0);

    // Sort by total score (descending)
    scores.sort((a, b) => b.totalScore - a.totalScore);

    // Take top results and format response
    const topScores = scores.slice(0, dto.limit || 10);
    const mentorDetails = await this.userRepository.findByIds(topScores.map(s => s.mentorId));
    const mentorMap = new Map(mentorDetails.map(m => [m.id, m]));

    return topScores.map(score => {
      const mentor = mentorMap.get(score.mentorId);
      const preference = preferenceMap.get(score.mentorId);
      
      return {
        mentor: {
          id: mentor.id,
          firstName: mentor.firstName,
          lastName: mentor.lastName,
          skills: mentor.skills,
          interests: mentor.interests,
          bio: mentor.bio,
          profileImage: mentor.profileImage
        },
        score: Math.round(score.totalScore * 100) / 100,
        matchReasons: score.matchReasons,
        isPreferred: !!preference && preference.type === PreferenceType.PREFERRED,
        preferenceWeight: preference?.weight
      };
    });
  }

  private calculateMatchScore(
    mentee: User,
    mentor: User,
    filters: RecommendationRequestDto,
    preference?: MenteePreference
  ): MatchScore {
    const matchReasons: string[] = [];
    
    // Skip blocked mentors
    if (preference?.type === PreferenceType.BLOCKED) {
      return {
        mentorId: mentor.id,
        skillsMatch: 0,
        interestsMatch: 0,
        preferenceBoost: 0,
        totalScore: 0,
        matchReasons: ['Blocked by mentee']
      };
    }

    // Skills matching
    const menteeSkills = filters.skills || mentee.skills;
    const skillsMatch = this.calculateArrayMatch(menteeSkills, mentor.skills);
    if (skillsMatch > 0) {
      matchReasons.push(`${Math.round(skillsMatch * 100)}% skills match`);
    }

    // Interests matching
    const menteeInterests = filters.interests || mentee.interests;
    const interestsMatch = this.calculateArrayMatch(menteeInterests, mentor.interests);
    if (interestsMatch > 0) {
      matchReasons.push(`${Math.round(interestsMatch * 100)}% interests match`);
    }

    // Preference boost
    let preferenceBoost = 0;
    if (preference?.type === PreferenceType.PREFERRED) {
      preferenceBoost = (preference.weight || 1) * 0.5; // Max 5.0 boost
      matchReasons.push(`Preferred mentor (weight: ${preference.weight})`);
    }

    // Calculate total score (weighted combination)
    const baseScore = (skillsMatch * 0.6) + (interestsMatch * 0.3) + (preferenceBoost * 0.1);
    const totalScore = baseScore + preferenceBoost;

    return {
      mentorId: mentor.id,
      skillsMatch,
      interestsMatch,
      preferenceBoost,
      totalScore,
      matchReasons
    };
  }

  private calculateArrayMatch(array1: string[], array2: string[]): number {
    if (!array1?.length || !array2?.length) return 0;
    
    const set1 = new Set(array1.map(item => item.toLowerCase()));
    const set2 = new Set(array2.map(item => item.toLowerCase()));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size; // Jaccard similarity
  }
}
