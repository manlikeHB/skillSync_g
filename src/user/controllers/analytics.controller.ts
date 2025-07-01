import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from '../entities/feedback.entity';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../enums/user-role.enum';

@UseGuards(RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
  ) {}

  // Average session ratings over time (grouped by month)
  @Roles(UserRole.ADMIN, UserRole.MENTOR)
  @Get('average-ratings')
  async getAverageRatings(@Query('months') months: number = 6) {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    const feedbacks = await this.feedbackRepository
      .createQueryBuilder('feedback')
      .where('feedback.createdAt >= :from', { from })
      .getMany();
    // Group by month
    const monthly: Record<string, { sum: number; count: number }> = {};
    feedbacks.forEach(fb => {
      const key = `${fb.createdAt.getFullYear()}-${fb.createdAt.getMonth() + 1}`;
      if (!monthly[key]) monthly[key] = { sum: 0, count: 0 };
      monthly[key].sum += fb.rating;
      monthly[key].count++;
    });
    const result = Object.entries(monthly).map(([month, data]) => ({
      month,
      average: data.count ? data.sum / data.count : 0,
      count: data.count,
    }));
    return result;
  }

  // Number of feedbacks (proxy for sessions completed)
  @Roles(UserRole.ADMIN, UserRole.MENTOR)
  @Get('sessions-count')
  async getSessionsCount() {
    const count = await this.feedbackRepository.count();
    return { sessionsCompleted: count };
  }

  // Engagement metrics: number of unique mentees, feedback frequency
  @Roles(UserRole.ADMIN, UserRole.MENTOR)
  @Get('engagement')
  async getEngagementMetrics() {
    const feedbacks = await this.feedbackRepository.find();
    const uniqueMentees = new Set(feedbacks.map(fb => fb.mentee?.id)).size;
    const totalFeedbacks = feedbacks.length;
    // Frequency: average feedbacks per mentee
    const frequency = uniqueMentees ? totalFeedbacks / uniqueMentees : 0;
    return {
      uniqueMentees,
      totalFeedbacks,
      averageFeedbacksPerMentee: frequency,
    };
  }
} 