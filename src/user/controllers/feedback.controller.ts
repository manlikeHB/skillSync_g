import { Controller, Post, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ReputationService } from '../services/reputation.service';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import { Feedback } from '../entities/feedback.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    // Verify mentee participation in the session
    const isMentee = await this.verifyMenteeParticipation(dto.sessionId, req.user.id);
    if (!isMentee) {
      throw new BadRequestException('You did not participate in this session as a mentee.');
    }
    // Save feedback
    const feedback = this.feedbackRepository.create({
      ...dto,
      mentee: { id: req.user.id },
    });
    await this.feedbackRepository.save(feedback);
    // Update mentor reputation
    await this.reputationService.updateMentorReputation(dto.mentorId);
    return { success: true };
  }
}
