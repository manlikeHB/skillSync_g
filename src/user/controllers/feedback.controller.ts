import { Controller, Post, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ReputationService } from '../services/reputation.service';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import { Feedback } from '../entities/feedback.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';

@UseGuards(JwtAuthGuard, ThrottlerGuard)
@Controller('feedback')
export class FeedbackController {
  constructor(
    private readonly reputationService: ReputationService,
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
  ) {}

  // Placeholder: Replace with actual session participation check
  private async verifyMenteeParticipation(sessionId: string, userId: string): Promise<boolean> {
    // TODO: Implement actual check against session data
    // For now, always return true
    return true;
  }

  // Utility: Simple quality score calculation
  private calculateQualityScore(comment?: string): number {
    if (!comment) return 0;
    // Simple logic: longer comments and positive words increase score
    const lengthScore = Math.min(comment.length / 100, 5); // up to 5 points
    const positiveWords = ['helpful', 'great', 'excellent', 'insightful', 'supportive', 'positive'];
    const positiveScore = positiveWords.some(word => comment.toLowerCase().includes(word)) ? 2 : 0;
    return Math.round(lengthScore + positiveScore);
  }

  @Post()
  async createFeedback(@Body() dto: CreateFeedbackDto, @Request() req) {
    // Prevent self-feedback
    if (req.user.id === dto.mentorId) {
      throw new BadRequestException('Cannot leave feedback for yourself.');
    }
    // Prevent duplicate feedback for the same session
    const exists = await this.feedbackRepository.findOne({
      where: { sessionId: dto.sessionId, mentee: { id: req.user.id } },
    });
    if (exists) {
      throw new BadRequestException('Feedback already submitted for this session.');
    }
    // Anti-spam: Minimum comment length for low ratings
    if (dto.rating <= 2 && (!dto.comment || dto.comment.length < 20)) {
      throw new BadRequestException('Please provide a detailed comment for low ratings.');
    }
    // Anti-abuse: Limit feedback frequency (e.g., 5 per day)
    const today = new Date();
    today.setHours(0,0,0,0);
    const feedbacksToday = await this.feedbackRepository.count({
      where: { mentee: { id: req.user.id }, createdAt: MoreThan(today) },
    });
    if (feedbacksToday >= 5) {
      throw new BadRequestException('Feedback limit reached for today.');
    }
    // Verify mentee participation in the session
    const isMentee = await this.verifyMenteeParticipation(dto.sessionId, req.user.id);
    if (!isMentee) {
      throw new BadRequestException('You did not participate in this session as a mentee.');
    }
    // Save feedback with calculated qualityScore
    const feedback = this.feedbackRepository.create({
      ...dto,
      mentee: { id: req.user.id },
      qualityScore: this.calculateQualityScore(dto.comment),
    });
    await this.feedbackRepository.save(feedback);
    // Update mentor reputation
    await this.reputationService.updateMentorReputation(dto.mentorId);
    return { success: true };
  }
}
