import { Controller, Post, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ReputationService } from '../services/reputation.service';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import { Feedback } from '../entities/feedback.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('feedback')
export class FeedbackController {
  constructor(
    private readonly reputationService: ReputationService,
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
  ) {}

  @UseGuards(JwtAuthGuard)
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
