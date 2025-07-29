import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Feedback } from '../../user/entities/feedback.entity';
import { MenteePreference } from '../../mentee-preference/entities/mentee-preference.entity';
import { MatchingProfile } from '../../matching/entities/matching-profile.entity';

@Injectable()
export class DataExtractionService {
  private readonly logger = new Logger(DataExtractionService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
    @InjectRepository(MenteePreference)
    private preferenceRepository: Repository<MenteePreference>,
    @InjectRepository(MatchingProfile)
    private matchingProfileRepository: Repository<MatchingProfile>,
  ) {}

  async extractMentorData(lastSync?: Date): Promise<any[]> {
    this.logger.log('Starting mentor data extraction');

    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.matchingProfiles', 'profile')
      .where('user.role IN (:...roles)', { roles: ['mentor', 'both'] })
      .andWhere('user.isActive = :active', { active: true });

    if (lastSync) {
      query.andWhere('user.updatedAt > :lastSync', { lastSync });
    }

    const mentors = await query.getMany();

    this.logger.log(`Extracted ${mentors.length} mentor records`);
    return mentors;
  }

  async extractMenteeData(lastSync?: Date): Promise<any[]> {
    this.logger.log('Starting mentee data extraction');

    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.preferences', 'preferences')
      .leftJoinAndSelect('user.matchingProfiles', 'profile')
      .where('user.role IN (:...roles)', { roles: ['mentee', 'both'] })
      .andWhere('user.isActive = :active', { active: true });

    if (lastSync) {
      query.andWhere('user.updatedAt > :lastSync', { lastSync });
    }

    const mentees = await query.getMany();

    this.logger.log(`Extracted ${mentees.length} mentee records`);
    return mentees;
  }

  async extractFeedbackData(userIds: string[]): Promise<Feedback[]> {
    if (userIds.length === 0) return [];

    const feedbacks = await this.feedbackRepository
      .createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.mentor', 'mentor')
      .leftJoinAndSelect('feedback.mentee', 'mentee')
      .where(
        'feedback.mentor.id IN (:...userIds) OR feedback.mentee.id IN (:...userIds)',
        { userIds },
      )
      .getMany();

    this.logger.log(`Extracted ${feedbacks.length} feedback records`);
    return feedbacks;
  }

  async extractMatchingProfiles(userIds: string[]): Promise<MatchingProfile[]> {
    if (userIds.length === 0) return [];

    const profiles = await this.matchingProfileRepository
      .createQueryBuilder('profile')
      .where('profile.userId IN (:...userIds)', { userIds })
      .getMany();

    this.logger.log(`Extracted ${profiles.length} matching profiles`);
    return profiles;
  }

  async extractPreferences(): Promise<MenteePreference[]> {
    const preferences = await this.preferenceRepository
      .createQueryBuilder('preference')
      .leftJoinAndSelect('preference.mentee', 'mentee')
      .leftJoinAndSelect('preference.preferredMentor', 'mentor')
      .getMany();

    this.logger.log(`Extracted ${preferences.length} mentee preferences`);
    return preferences;
  }
}
