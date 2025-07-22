import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { FeedbackService } from '../services/feedback.service';
import { CreateFeedbackDto } from '../dto/feedback/create-feedback.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  async createFeedback(@Req() req, @Body() createFeedbackDto: CreateFeedbackDto) {
    return this.feedbackService.createFeedback(req.user.id, createFeedbackDto);
  }

  @Get('match/:matchId/summary')
  async getFeedbackSummary(@Param('matchId') matchId: string) {
    return this.feedbackService.getFeedbackSummary(matchId);
  }

  @Get('match/:matchId')
  async getMatchFeedback(@Param('matchId') matchId: string) {
    return this.feedbackService.getFeedbackForMatch(matchId);
  }

  @Get('my-feedback')
  async getMyFeedback(@Req() req) {
    return this.feedbackService.getUserFeedbackHistory(req.user.id);
  }
}