import { Injectable } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';
import { MatchingFactors } from './matching-algorithm.service';
import { RecommendationExplanationDto, ExplanationFactorDto } from '../dto/explanation.dto';

@Injectable()
export class ExplanationService {
  generateExplanation(
    requester: User,
    candidate: User,
    matchScore: number,
    factors: MatchingFactors,
    type: 'mentor' | 'mentee'
  ): RecommendationExplanationDto {
    const explanationFactors = this.buildExplanationFactors(
      requester,
      candidate,
      factors,
      type
    );

    const primaryReason = this.determinePrimaryReason(factors, type);
    const concerns = this.identifyConcerns(factors, requester, candidate, type);
    const advantages = this.identifyAdvantages(factors, requester, candidate, type);

    return {
      matchScore: Math.round(matchScore),
      primaryReason,
      factors: explanationFactors,
      concerns,
      advantages,
    };
  }

  private buildExplanationFactors(
    requester: User,
    candidate: User,
    factors: MatchingFactors,
    type: 'mentor' | 'mentee'
  ): ExplanationFactorDto[] {
    const explanationFactors: ExplanationFactorDto[] = [];

    // Skills explanation
    explanationFactors.push({
      factor: 'Skills Alignment',
      weight: factors.skillsMatch,
      explanation: this.explainSkillsMatch(requester.skills, candidate.skills, factors.skillsMatch),
      details: this.getSkillsMatchDetails(requester.skills, candidate.skills),
    });

    // Industry explanation
    explanationFactors.push({
      factor: 'Industry Experience',
      weight: factors.industryMatch,
      explanation: this.explainIndustryMatch(requester.industry, candidate.industry, factors.industryMatch),
      details: `Requester: ${requester.industry}, Candidate: ${candidate.industry}`,
    });

    // Experience explanation
    explanationFactors.push({
      factor: 'Experience Level',
      weight: factors.experienceGap,
      explanation: this.explainExperienceGap(
        requester.experienceYears,
        candidate.experienceYears,
        factors.experienceGap,
        type
      ),
      details: `Experience gap: ${candidate.experienceYears - requester.experienceYears} years`,
    });

    // Location explanation
    explanationFactors.push({
      factor: 'Location Compatibility',
      weight: factors.locationMatch,
      explanation: this.explainLocationMatch(requester.location, candidate.location, factors.locationMatch),
      details: `Requester: ${requester.location}, Candidate: ${candidate.location}`,
    });

    return explanationFactors.sort((a, b) => b.weight - a.weight);
  }

  private explainSkillsMatch(requesterSkills: string[], candidateSkills: string[], score: number): string {
    if (score >= 0.7) {
      return 'Excellent skills alignment with strong overlap in key competencies';
    } else if (score >= 0.4) {
      return 'Good skills match with some complementary expertise';
    } else if (score >= 0.2) {
      return 'Moderate skills alignment with potential for knowledge transfer';
    } else {
      return 'Limited direct skills overlap, but potential for diverse perspective';
    }
  }

  private getSkillsMatchDetails(requesterSkills: string[], candidateSkills: string[]): string {
    const commonSkills = requesterSkills.filter(skill => 
      candidateSkills.some(candidateSkill => 
        candidateSkill.toLowerCase().includes(skill.toLowerCase())
      )
    );

    if (commonSkills.length > 0) {
      return `Common skills: ${commonSkills.join(', ')}`;
    }
    return 'No direct skill matches found';
  }

  private explainIndustryMatch(requesterIndustry: string, candidateIndustry: string, score: number): string {
    if (score === 1) {
      return 'Same industry background provides relevant context and experience';
    } else if (score > 0.3) {
      return 'Related industry experience offers transferable insights';
    } else {
      return 'Different industry background can provide fresh perspectives';
    }
  }

  private explainExperienceGap(
    requesterExp: number,
    candidateExp: number,
    score: number,
    type: 'mentor' | 'mentee'
  ): string {
    const gap = candidateExp - requesterExp;
    
    if (type === 'mentor') {
      if (score >= 0.8) {
        return `Ideal experience gap (${gap} years) for effective mentoring relationship`;
      } else if (score >= 0.5) {
        return `Reasonable experience difference for knowledge transfer`;
      } else {
        return `Experience gap may be too large or small for optimal mentoring`;
      }
    } else {
      if (score >= 0.8) {
        return `Good experience level for mentee relationship`;
      } else {
        return `Experience levels may not align perfectly for mentee dynamic`;
      }
    }
  }

  private explainLocationMatch(requesterLocation: string, candidateLocation: string, score: number): string {
    if (score >= 0.8) {
      return 'Close geographical proximity enables in-person meetings';
    } else if (score >= 0.6) {
      return 'Same region allows for occasional in-person interaction';
    } else {
      return 'Remote relationship would rely on virtual communication';
    }
  }

  private determinePrimaryReason(factors: MatchingFactors, type: 'mentor' | 'mentee'): string {
    const sortedFactors = Object.entries(factors)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2);

    const [topFactor, topScore] = sortedFactors[0];
    
    switch (topFactor) {
      case 'skillsMatch':
        return `Strong skills alignment makes this an excellent ${type} match`;
      case 'industryMatch':
        return `Shared industry experience provides valuable context`;
      case 'experienceGap':
        return `Ideal experience level difference for effective mentoring`;
      case 'locationMatch':
        return `Geographic proximity enables flexible meeting options`;
      default:
        return `Well-rounded match across multiple compatibility factors`;
    }
  }

  private identifyConcerns(
    factors: MatchingFactors,
    requester: User,
    candidate: User,
    type: 'mentor' | 'mentee'
  ): string[] {
    const concerns: string[] = [];

    if (factors.skillsMatch < 0.3) {
      concerns.push('Limited overlap in technical skills may require more foundational discussions');
    }

    if (factors.experienceGap < 0.5) {
      concerns.push('Experience levels may not provide optimal learning dynamic');
    }

    if (factors.locationMatch < 0.4) {
      concerns.push('Geographic distance may limit in-person interaction opportunities');
    }

    if (!candidate.isAvailableForMentoring) {
      concerns.push('Candidate availability for mentoring may be limited');
    }

    return concerns;
  }

  private identifyAdvantages(
    factors: MatchingFactors,
    requester: User,
    candidate: User,
    type: 'mentor' | 'mentee'
  ): string[] {
    const advantages: string[] = [];

    if (factors.skillsMatch >= 0.7) {
      advantages.push('Strong technical foundation for targeted skill development');
    }

    if (factors.industryMatch >= 0.8) {
      advantages.push('Industry-specific insights and network connections');
    }

    if (factors.experienceGap >= 0.8) {
      advantages.push('Optimal experience gap for knowledge transfer and growth');
    }

    if (factors.locationMatch >= 0.7) {
      advantages.push('Proximity allows for flexible meeting arrangements');
    }

    if (candidate.isAvailableForMentoring) {
      advantages.push('Confirmed availability and commitment to mentoring');
    }

    return advantages;
  }
}
