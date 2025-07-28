import { Injectable } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';

export interface MatchingFactors {
  skillsMatch: number;
  industryMatch: number;
  experienceGap: number;
  locationMatch: number;
  availabilityMatch: number;
}

@Injectable()
export class MatchingAlgorithmService {
  calculateMatch(requester: User, candidate: User, type: 'mentor' | 'mentee'): {
    score: number;
    factors: MatchingFactors;
  } {
    const factors: MatchingFactors = {
      skillsMatch: this.calculateSkillsMatch(requester.skills, candidate.skills),
      industryMatch: this.calculateIndustryMatch(requester.industry, candidate.industry),
      experienceGap: this.calculateExperienceGap(
        requester.experienceYears,
        candidate.experienceYears,
        type
      ),
      locationMatch: this.calculateLocationMatch(requester.location, candidate.location),
      availabilityMatch: candidate.isAvailableForMentoring ? 1 : 0,
    };

    // Weighted scoring
    const weights = {
      skillsMatch: 0.3,
      industryMatch: 0.2,
      experienceGap: 0.25,
      locationMatch: 0.15,
      availabilityMatch: 0.1,
    };

    const score = Object.keys(factors).reduce((total, key) => {
      return total + factors[key] * weights[key];
    }, 0) * 100;

    return { score, factors };
  }

  private calculateSkillsMatch(requesterSkills: string[], candidateSkills: string[]): number {
    if (!requesterSkills.length || !candidateSkills.length) return 0;

    const intersection = requesterSkills.filter(skill => 
      candidateSkills.some(candidateSkill => 
        candidateSkill.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(candidateSkill.toLowerCase())
      )
    );

    return intersection.length / Math.max(requesterSkills.length, candidateSkills.length);
  }

  private calculateIndustryMatch(requesterIndustry: string, candidateIndustry: string): number {
    if (!requesterIndustry || !candidateIndustry) return 0;
    return requesterIndustry.toLowerCase() === candidateIndustry.toLowerCase() ? 1 : 0.3;
  }

  private calculateExperienceGap(
    requesterExp: number,
    candidateExp: number,
    type: 'mentor' | 'mentee'
  ): number {
    const gap = candidateExp - requesterExp;
    
    if (type === 'mentor') {
      // For mentors, we want candidates with more experience
      if (gap >= 3 && gap <= 10) return 1;
      if (gap >= 1 && gap < 3) return 0.7;
      if (gap > 10) return 0.5;
      return 0.2; // Less or equal experience
    } else {
      // For mentees, we want candidates with less experience
      if (gap <= -1 && gap >= -8) return 1;
      if (gap > -1) return 0.3;
      return 0.5; // Much less experience
    }
  }

  private calculateLocationMatch(requesterLocation: string, candidateLocation: string): number {
    if (!requesterLocation || !candidateLocation) return 0.5;
    
    const requesterParts = requesterLocation.toLowerCase().split(',').map(s => s.trim());
    const candidateParts = candidateLocation.toLowerCase().split(',').map(s => s.trim());
    
    // Exact match
    if (requesterLocation.toLowerCase() === candidateLocation.toLowerCase()) return 1;
    
    // Same city
    if (requesterParts[0] === candidateParts[0]) return 0.8;
    
    // Same state/region
    if (requesterParts.length > 1 && candidateParts.length > 1 && 
        requesterParts[1] === candidateParts[1]) return 0.6;
    
    return 0.3; // Different locations
  }
}