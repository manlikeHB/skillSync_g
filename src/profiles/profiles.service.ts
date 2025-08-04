import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MentorProfile } from '../database/entities/mentor-profile.entity';
import { MenteeProfile } from '../database/entities/mentee-profile.entity';
import { ProfileFiltersDto } from './dto/profile-filters.dto';
import { AvailabilityStatus, ExperienceLevel } from '../common/enums/user-role.enum';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(MentorProfile)
    private mentorProfileRepository: Repository<MentorProfile>,
    @InjectRepository(MenteeProfile)
    private menteeProfileRepository: Repository<MenteeProfile>,
  ) {}

  async findMentors(filters: ProfileFiltersDto): Promise<MentorProfile[]> {
    const query = this.mentorProfileRepository
      .createQueryBuilder('mentor')
      .leftJoinAndSelect('mentor.user', 'user')
      .where('mentor.availabilityStatus = :status', {
        status: AvailabilityStatus.AVAILABLE,
      })
      .andWhere('mentor.currentMentees < mentor.maxMentees')
      .andWhere('user.isActive = :isActive', { isActive: true });

    if (filters.skills && filters.skills.length > 0) {
      query.andWhere('mentor.skills && :skills', { skills: filters.skills });
    }

    if (filters.industries && filters.industries.length > 0) {
      query.andWhere('mentor.industries && :industries', {
        industries: filters.industries,
      });
    }

    if (filters.experienceLevel) {
      query.andWhere('mentor.experienceLevel = :experienceLevel', {
        experienceLevel: filters.experienceLevel,
      });
    }

    if (filters.minRating) {
      query.andWhere('mentor.rating >= :minRating', {
        minRating: filters.minRating,
      });
    }

    if (filters.maxHourlyRate) {
      query.andWhere(
        '(mentor.hourlyRate IS NULL OR mentor.hourlyRate <= :maxRate)',
        { maxRate: filters.maxHourlyRate },
      );
    }

    if (filters.languages && filters.languages.length > 0) {
      query.andWhere('mentor.languages && :languages', {
        languages: filters.languages,
      });
    }

    return query
      .orderBy('mentor.rating', 'DESC')
      .addOrderBy('mentor.totalReviews', 'DESC')
      .limit(filters.limit || 20)
      .getMany();
  }

  async findMentees(filters: ProfileFiltersDto): Promise<MenteeProfile[]> {
    const query = this.menteeProfileRepository
      .createQueryBuilder('mentee')
      .leftJoinAndSelect('mentee.user', 'user')
      .where('mentee.isLookingForMentor = :looking', { looking: true })
      .andWhere('user.isActive = :isActive', { isActive: true });

    if (filters.interests && filters.interests.length > 0) {
      query.andWhere('mentee.interests && :interests', {
        interests: filters.interests,
      });
    }

    if (filters.targetIndustries && filters.targetIndustries.length > 0) {
      query.andWhere('mentee.targetIndustries && :industries', {
        industries: filters.targetIndustries,
      });
    }

    if (filters.currentLevel) {
      query.andWhere('mentee.currentLevel = :currentLevel', {
        currentLevel: filters.currentLevel,
      });
    }

    if (filters.languages && filters.languages.length > 0) {
      query.andWhere('mentee.languages && :languages', {
        languages: filters.languages,
      });
    }

    return query
      .orderBy('mentee.createdAt', 'DESC')
      .limit(filters.limit || 20)
      .getMany();
  }

  async getMentorById(id: string): Promise<MentorProfile> {
    const mentor = await this.mentorProfileRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!mentor) {
      throw new NotFoundException(`Mentor profile with ID ${id} not found`);
    }

    return mentor;
  }

  async getMenteeById(id: string): Promise<MenteeProfile> {
    const mentee = await this.menteeProfileRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!mentee) {
      throw new NotFoundException(`Mentee profile with ID ${id} not found`);
    }

    return mentee;
  }

  async calculateMatchScore(
    mentorId: string,
    menteeId: string,
  ): Promise<{ score: number; matchFactors: string[] }> {
    const mentor = await this.mentorProfileRepository.findOne({
      where: { id: mentorId },
      relations: ['user'],
    });

    const mentee = await this.menteeProfileRepository.findOne({
      where: { id: menteeId },
      relations: ['user'],
    });

    if (!mentor || !mentee) {
      return { score: 0, matchFactors: [] };
    }

    let score = 0;
    const matchFactors: string[] = [];

    // Skills matching (30% weight)
    const skillIntersection = mentor.skills.filter((skill) =>
      mentee.skillsToLearn.some((toLearn) =>
        toLearn.toLowerCase().includes(skill.toLowerCase()),
      ),
    );
    if (skillIntersection.length > 0) {
      score += (skillIntersection.length / mentee.skillsToLearn.length) * 30;
      matchFactors.push(`Matching skills: ${skillIntersection.join(', ')}`);
    }

    // Industry matching (20% weight)
    const industryIntersection = mentor.industries.filter((industry) =>
      mentee.targetIndustries.includes(industry),
    );
    if (industryIntersection.length > 0) {
      score += (industryIntersection.length / mentee.targetIndustries.length) * 20;
      matchFactors.push(`Matching industries: ${industryIntersection.join(', ')}`);
    }

    // Language matching (15% weight)
    const languageIntersection = mentor.languages.filter((lang) =>
      mentee.languages.includes(lang),
    );
    if (languageIntersection.length > 0) {
      score += (languageIntersection.length / Math.max(mentor.languages.length, mentee.languages.length)) * 15;
      matchFactors.push(`Common languages: ${languageIntersection.join(', ')}`);
    }

    // Experience level compatibility (15% weight)
    const mentorLevelValue = this.getExperienceLevelValue(mentor.experienceLevel);
    const menteeLevelValue = this.getExperienceLevelValue(mentee.currentLevel);
    
    if (mentorLevelValue > menteeLevelValue) {
      const levelDiff = mentorLevelValue - menteeLevelValue;
      score += Math.max(0, 15 - (levelDiff * 5)); // Penalize large gaps
      matchFactors.push(`Experience level compatibility`);
    }

    // Availability matching (10% weight)
    if (mentor.availability && mentee.availability) {
      const availabilityScore = this.calculateAvailabilityMatch(
        mentor.availability,
        mentee.availability,
      );
      score += availabilityScore * 10;
      if (availabilityScore > 0.5) {
        matchFactors.push(`Compatible schedules`);
      }
    }

    // Mentor rating bonus (10% weight)
    if (mentor.rating > 0) {
      score += (mentor.rating / 5) * 10;
      matchFactors.push(`High mentor rating: ${mentor.rating}/5`);
    }

    return {
      score: Math.min(100, Math.round(score)),
      matchFactors,
    };
  }

  private getExperienceLevelValue(level: ExperienceLevel): number {
    const levelMap = {
      [ExperienceLevel.BEGINNER]: 1,
      [ExperienceLevel.INTERMEDIATE]: 2,
      [ExperienceLevel.ADVANCED]: 3,
      [ExperienceLevel.EXPERT]: 4,
    };
    return levelMap[level] || 1;
  }

  private calculateAvailabilityMatch(
    mentorAvailability: any,
    menteeAvailability: any,
  ): number {
    const commonDays = mentorAvailability.days.filter((day: string) =>
      menteeAvailability.days.includes(day),
    );

    const commonTimeSlots = mentorAvailability.timeSlots.filter((slot: string) =>
      menteeAvailability.timeSlots.includes(slot),
    );

    if (commonDays.length === 0 || commonTimeSlots.length === 0) {
      return 0;
    }

    const dayScore = commonDays.length / Math.max(mentorAvailability.days.length, menteeAvailability.days.length);
    const timeScore = commonTimeSlots.length / Math.max(mentorAvailability.timeSlots.length, menteeAvailability.timeSlots.length);

    return (dayScore + timeScore) / 2;
  }

  async getRecommendedMatches(
    userId: string,
    userType: 'mentor' | 'mentee',
    limit = 10,
  ): Promise<any[]> {
    if (userType === 'mentee') {
      const mentee = await this.menteeProfileRepository.findOne({
        where: { userId },
      });

      if (!mentee) {
        return [];
      }

      const mentors = await this.findMentors({
        skills: mentee.skillsToLearn,
        industries: mentee.targetIndustries,
        languages: mentee.languages,
        limit: 50, // Get more to calculate scores
      });

      const matches = await Promise.all(
        mentors.map(async (mentor) => {
          const matchData = await this.calculateMatchScore(mentor.id, mentee.id);
          return {
            mentor,
            matchScore: matchData.score,
            matchFactors: matchData.matchFactors,
          };
        }),
      );

      return matches
        .filter((match) => match.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);
    } else {
      const mentor = await this.mentorProfileRepository.findOne({
        where: { userId },
      });

      if (!mentor) {
        return [];
      }

      const mentees = await this.findMentees({
        interests: mentor.skills,
        targetIndustries: mentor.industries,
        languages: mentor.languages,
        limit: 50,
      });

      const matches = await Promise.all(
        mentees.map(async (mentee) => {
          const matchData = await this.calculateMatchScore(mentor.id, mentee.id);
          return {
            mentee,
            matchScore: matchData.score,
            matchFactors: matchData.matchFactors,
          };
        }),
      );

      return matches
        .filter((match) => match.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);
    }
  }

  async updateMentorAvailability(
    mentorId: string,
    availabilityStatus: AvailabilityStatus,
  ): Promise<MentorProfile> {
    const mentor = await this.getMentorById(mentorId);
    mentor.availabilityStatus = availabilityStatus;
    return this.mentorProfileRepository.save(mentor);
  }

  async incrementMentorMenteeCount(mentorId: string): Promise<void> {
    await this.mentorProfileRepository.increment(
      { id: mentorId },
      'currentMentees',
      1,
    );
  }

  async decrementMentorMenteeCount(mentorId: string): Promise<void> {
    await this.mentorProfileRepository.decrement(
      { id: mentorId },
      'currentMentees',
      1,
    );
  }

  async updateMentorRating(
    mentorId: string,
    newRating: number,
  ): Promise<MentorProfile> {
    const mentor = await this.getMentorById(mentorId);
    
    // Calculate new average rating
    const totalRatings = mentor.totalReviews * mentor.rating + newRating;
    const newTotalReviews = mentor.totalReviews + 1;
    const newAverageRating = totalRatings / newTotalReviews;

    mentor.rating = Math.round(newAverageRating * 100) / 100; // Round to 2 decimal places
    mentor.totalReviews = newTotalReviews;

    return this.mentorProfileRepository.save(mentor);
  }

  async getPopularSkills(limit = 20): Promise<{ skill: string; count: number }[]> {
    const result = await this.mentorProfileRepository
      .createQueryBuilder('mentor')
      .select('unnest(mentor.skills)', 'skill')
      .addSelect('COUNT(*)', 'count')
      .groupBy('skill')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map(row => ({
      skill: row.skill,
      count: parseInt(row.count, 10),
    }));
  }

  async getPopularIndustries(limit = 15): Promise<{ industry: string; count: number }[]> {
    const result = await this.mentorProfileRepository
      .createQueryBuilder('mentor')
      .select('unnest(mentor.industries)', 'industry')
      .addSelect('COUNT(*)', 'count')
      .groupBy('industry')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map(row => ({
      industry: row.industry,
      count: parseInt(row.count, 10),
    }));
  }

  async getProfileStats(): Promise<{
    totalMentors: number;
    totalMentees: number;
    availableMentors: number;
    lookingForMentorMentees: number;
    averageMentorRating: number;
  }> {
    const [
      totalMentors,
      totalMentees,
      availableMentors,
      lookingForMentorMentees,
      ratingResult,
    ] = await Promise.all([
      this.mentorProfileRepository.count(),
      this.menteeProfileRepository.count(),
      this.mentorProfileRepository.count({
        where: { availabilityStatus: AvailabilityStatus.AVAILABLE },
      }),
      this.menteeProfileRepository.count({
        where: { isLookingForMentor: true },
      }),
      this.mentorProfileRepository
        .createQueryBuilder('mentor')
        .select('AVG(mentor.rating)', 'average')
        .where('mentor.rating > 0')
        .getRawOne(),
    ]);

    return {
      totalMentors,
      totalMentees,
      availableMentors,
      lookingForMentorMentees,
      averageMentorRating: parseFloat(ratingResult?.average || '0'),
    };
  }
}