import { Injectable, Logger } from '@nestjs/common';
import {
  CleanedMentorData,
  CleanedMenteeData,
  MatchingFeatureVector,
} from '../interfaces/pipeline.interface';

@Injectable()
export class DataTransformationService {
  private readonly logger = new Logger(DataTransformationService.name);

  async transformMentorData(
    rawData: any[],
    feedbacks: any[],
    profiles: any[],
  ): Promise<CleanedMentorData[]> {
    this.logger.log(`Transforming ${rawData.length} mentor records`);

    const cleanedData: CleanedMentorData[] = [];

    for (const mentor of rawData) {
      try {
        const mentorFeedbacks = feedbacks.filter(
          (f) => f.mentor?.id === mentor.id,
        );
        const mentorProfile = profiles.find((p) => p.userId === mentor.id);

        const cleaned: CleanedMentorData = {
          userId: mentor.id,
          profile: {
            name: this.cleanName(mentor.name),
            email: mentor.email.toLowerCase().trim(),
            bio: this.cleanText(mentor.bio),
            verified: !!mentor.credentialFile,
          },
          expertise: {
            skills: this.normalizeSkills(mentor.skills || []),
            domains: this.extractDomains(mentorProfile?.expertiseAreas || []),
            experienceLevel: this.categorizeExperience(
              mentor.experienceYears || 0,
            ),
            yearsOfExperience: mentor.experienceYears || 0,
          },
          availability: {
            timezone: mentor.timezone || 'UTC',
            preferredTimes: mentorProfile?.availableTimes || [],
            maxMentees: mentor.maxMentees || 5,
            currentLoad: await this.calculateCurrentLoad(mentor.id),
          },
          preferences: {
            menteeLevel: mentorProfile?.preferences?.menteeLevel || [],
            communicationStyle:
              mentorProfile?.preferences?.communicationStyle || [],
            sessionTypes: mentorProfile?.preferences?.sessionTypes || [],
          },
          reputation: {
            score: mentor.reputationScore || 0,
            totalSessions: mentorFeedbacks.length,
            averageRating: this.calculateAverageRating(mentorFeedbacks),
            feedbackCount: mentorFeedbacks.length,
          },
          metadata: {
            lastActive: mentor.lastActive || mentor.updatedAt,
            profileCompleteness: this.calculateProfileCompleteness(
              mentor,
              mentorProfile,
            ),
            verificationStatus: mentor.credentialFile ? 'verified' : 'pending',
            createdAt: mentor.createdAt,
            updatedAt: mentor.updatedAt,
          },
        };

        cleanedData.push(cleaned);
      } catch (error) {
        this.logger.error(`Error transforming mentor ${mentor.id}:`, error);
      }
    }

    this.logger.log(
      `Successfully transformed ${cleanedData.length} mentor records`,
    );
    return cleanedData;
  }

  async transformMenteeData(
    rawData: any[],
    preferences: any[],
    profiles: any[],
  ): Promise<CleanedMenteeData[]> {
    this.logger.log(`Transforming ${rawData.length} mentee records`);

    const cleanedData: CleanedMenteeData[] = [];

    for (const mentee of rawData) {
      try {
        const menteePreferences = preferences.filter(
          (p) => p.menteeId === mentee.id,
        );
        const menteeProfile = profiles.find((p) => p.userId === mentee.id);

        const cleaned: CleanedMenteeData = {
          userId: mentee.id,
          profile: {
            name: this.cleanName(mentee.name),
            email: mentee.email.toLowerCase().trim(),
            bio: this.cleanText(mentee.bio),
          },
          goals: {
            learningObjectives: menteeProfile?.learningGoals || [],
            skillsToLearn: this.normalizeSkills(mentee.skills || []),
            careerGoals: this.extractCareerGoals(mentee.bio || ''),
            timeframe: menteeProfile?.preferences?.timeframe || 'medium',
          },
          currentLevel: {
            skills: this.buildSkillsMap(mentee.skills || []),
            experience: this.categorizeExperience(mentee.experienceYears || 0),
            background: menteeProfile?.background || [],
          },
          preferences: {
            mentorExperience:
              menteeProfile?.preferences?.mentorExperience || [],
            communicationStyle:
              menteeProfile?.preferences?.communicationStyle || [],
            sessionFrequency:
              menteeProfile?.preferences?.sessionFrequency || 'weekly',
            availability: menteeProfile?.availableTimes || [],
          },
          engagement: {
            sessionsCompleted: await this.getSessionsCompleted(mentee.id),
            averageRating: await this.getMenteeAverageRating(mentee.id),
            lastSessionDate: await this.getLastSessionDate(mentee.id),
            responsiveness: await this.calculateResponsiveness(mentee.id),
          },
          metadata: {
            joinDate: mentee.createdAt,
            profileCompleteness: this.calculateProfileCompleteness(
              mentee,
              menteeProfile,
            ),
            lastActive: mentee.lastActive || mentee.updatedAt,
            preferences: menteeProfile?.preferences || {},
          },
        };

        cleanedData.push(cleaned);
      } catch (error) {
        this.logger.error(`Error transforming mentee ${mentee.id}:`, error);
      }
    }

    this.logger.log(
      `Successfully transformed ${cleanedData.length} mentee records`,
    );
    return cleanedData;
  }

  async generateFeatureVectors(
    mentors: CleanedMentorData[],
    mentees: CleanedMenteeData[],
  ): Promise<MatchingFeatureVector[]> {
    this.logger.log('Generating feature vectors for matching algorithm');

    const vectors: MatchingFeatureVector[] = [];

    // Generate vectors for mentors
    for (const mentor of mentors) {
      vectors.push({
        userId: mentor.userId,
        userType: 'mentor',
        features: {
          skillsVector: await this.generateSkillsVector(
            mentor.expertise.skills,
          ),
          experienceVector: this.generateExperienceVector(mentor.expertise),
          availabilityVector: this.generateAvailabilityVector(
            mentor.availability,
          ),
          preferenceVector: this.generatePreferenceVector(mentor.preferences),
          reputationVector: this.generateReputationVector(mentor.reputation),
          engagementVector: this.generateEngagementVector(mentor.metadata),
        },
        metadata: {
          lastUpdated: new Date(),
          version: '1.0',
          qualityScore: this.calculateVectorQuality(mentor),
        },
      });
    }

    // Generate vectors for mentees
    for (const mentee of mentees) {
      vectors.push({
        userId: mentee.userId,
        userType: 'mentee',
        features: {
          skillsVector: await this.generateSkillsVector(
            mentee.goals.skillsToLearn,
          ),
          experienceVector: this.generateExperienceVectorFromLevel(
            mentee.currentLevel,
          ),
          availabilityVector: this.generateAvailabilityVectorFromPrefs(
            mentee.preferences,
          ),
          preferenceVector: this.generatePreferenceVectorFromMentee(
            mentee.preferences,
          ),
          reputationVector: this.generateEngagementReputationVector(
            mentee.engagement,
          ),
          engagementVector: this.generateMenteeEngagementVector(
            mentee.engagement,
          ),
        },
        metadata: {
          lastUpdated: new Date(),
          version: '1.0',
          qualityScore: this.calculateVectorQuality(mentee),
        },
      });
    }

    this.logger.log(`Generated ${vectors.length} feature vectors`);
    return vectors;
  }

  // Helper methods for data cleaning and transformation
  private cleanName(name: string): string {
    if (!name) return '';
    return name
      .trim()
      .replace(/[^\w\s-']/g, '')
      .replace(/\s+/g, ' ');
  }

  private cleanText(text?: string): string | undefined {
    if (!text) return undefined;
    return text.trim().replace(/\s+/g, ' ').substring(0, 1000);
  }

  private normalizeSkills(skills: string[]): string[] {
    return skills
      .map((skill) => skill.toLowerCase().trim())
      .filter((skill) => skill.length > 0)
      .filter((skill, index, array) => array.indexOf(skill) === index); // Remove duplicates
  }

  private extractDomains(expertiseAreas: string[]): string[] {
    // Map expertise areas to broader domains
    const domainMapping: Record<string, string> = {
      javascript: 'web-development',
      python: 'backend-development',
      react: 'frontend-development',
      'machine-learning': 'ai-ml',
      // Add more mappings as needed
    };

    return expertiseAreas.map(
      (area) => domainMapping[area.toLowerCase()] || area.toLowerCase(),
    );
  }

  private categorizeExperience(
    years: number,
  ): 'junior' | 'mid' | 'senior' | 'expert' {
    if (years < 2) return 'junior';
    if (years < 5) return 'mid';
    if (years < 10) return 'senior';
    return 'expert';
  }

  private calculateAverageRating(feedbacks: any[]): number {
    if (feedbacks.length === 0) return 0;
    const sum = feedbacks.reduce((acc, f) => acc + (f.rating || 0), 0);
    return sum / feedbacks.length;
  }

  private calculateProfileCompleteness(user: any, profile: any): number {
    let completeness = 0;
    const totalFields = 10;

    if (user.name) completeness++;
    if (user.email) completeness++;
    if (user.bio) completeness++;
    if (user.skills?.length > 0) completeness++;
    if (user.credentialFile) completeness++;
    if (profile?.expertiseAreas?.length > 0) completeness++;
    if (profile?.availableTimes?.length > 0) completeness++;
    if (profile?.preferences) completeness++;
    if (user.experienceYears > 0) completeness++;
    if (user.isActive) completeness++;

    return (completeness / totalFields) * 100;
  }

  private async generateSkillsVector(skills: string[]): Promise<number[]> {
    // This would integrate with your semantic similarity service
    // For now, returning a placeholder vector
    const vector = new Array(100).fill(0);
    skills.forEach((skill, index) => {
      if (index < vector.length) {
        vector[index] = 1;
      }
    });
    return vector;
  }

  private generateExperienceVector(expertise: any): number[] {
    return [
      expertise.yearsOfExperience / 20, // Normalized years
      expertise.experienceLevel === 'junior' ? 1 : 0,
      expertise.experienceLevel === 'mid' ? 1 : 0,
      expertise.experienceLevel === 'senior' ? 1 : 0,
      expertise.experienceLevel === 'expert' ? 1 : 0,
    ];
  }

  private generateAvailabilityVector(availability: any): number[] {
    return [
      availability.maxMentees / 10, // Normalized max mentees
      1 - availability.currentLoad / availability.maxMentees, // Available capacity
      availability.preferredTimes.length / 7, // Flexibility score
    ];
  }

  private generatePreferenceVector(preferences: any): number[] {
    // Convert preferences to numerical vector
    return [
      preferences.menteeLevel.length / 4, // Normalized preference count
      preferences.communicationStyle.length / 3,
      preferences.sessionTypes.length / 5,
    ];
  }

  private generateReputationVector(reputation: any): number[] {
    return [
      Math.min(reputation.score / 100, 1), // Normalized reputation score
      Math.min(reputation.averageRating / 5, 1), // Normalized rating
      Math.min(reputation.totalSessions / 50, 1), // Normalized session count
    ];
  }

  private generateEngagementVector(metadata: any): number[] {
    const daysSinceActive =
      (Date.now() - new Date(metadata.lastActive).getTime()) /
      (1000 * 60 * 60 * 24);
    return [
      Math.max(0, 1 - daysSinceActive / 30), // Recent activity score
      metadata.profileCompleteness / 100, // Profile completeness
    ];
  }

  private calculateVectorQuality(data: any): number {
    // Calculate quality score based on data completeness and validity
    let quality = 0;

    if (data.profile?.name) quality += 10;
    if (data.profile?.email) quality += 10;
    if (data.profile?.bio) quality += 15;

    if (
      data.expertise?.skills?.length > 0 ||
      data.goals?.skillsToLearn?.length > 0
    )
      quality += 20;
    if (data.availability || data.preferences?.availability) quality += 15;
    if (data.reputation || data.engagement) quality += 20;
    if (data.metadata?.profileCompleteness > 70) quality += 10;

    return quality;
  }

  // Placeholder methods - implement based on your business logic
  private async calculateCurrentLoad(mentorId: string): Promise<number> {
    return 0;
  }
  private extractCareerGoals(bio: string): string[] {
    return [];
  }
  private buildSkillsMap(skills: string[]): Record<string, number> {
    return {};
  }
  private async getSessionsCompleted(userId: string): Promise<number> {
    return 0;
  }
  private async getMenteeAverageRating(userId: string): Promise<number> {
    return 0;
  }
  private async getLastSessionDate(userId: string): Promise<Date | undefined> {
    return undefined;
  }
  private async calculateResponsiveness(userId: string): Promise<number> {
    return 0;
  }
  private generateExperienceVectorFromLevel(level: any): number[] {
    return [];
  }
  private generateAvailabilityVectorFromPrefs(prefs: any): number[] {
    return [];
  }
  private generatePreferenceVectorFromMentee(prefs: any): number[] {
    return [];
  }
  private generateEngagementReputationVector(engagement: any): number[] {
    return [];
  }
  private generateMenteeEngagementVector(engagement: any): number[] {
    return [];
  }
}
