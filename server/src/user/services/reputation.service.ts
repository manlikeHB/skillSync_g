import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from '../entities/feedback.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class ReputationService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
  ) {}

  async updateMentorReputation(mentorId: string): Promise<void> {
    const feedbacks = await this.feedbackRepository.find({ where: { mentor: { id: mentorId } } });
    const completedSessions = feedbacks.length;
    const avgRating = feedbacks.length
      ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
      : 0;
    const avgQuality = feedbacks.length
      ? feedbacks.reduce((sum, f) => sum + f.qualityScore, 0) / feedbacks.length
      : 0;
    // Example scoring formula
    const score = completedSessions * 2 + avgRating * 10 + avgQuality * 5;
    await this.userRepository.update(mentorId, { reputationScore: score });
  }
}
