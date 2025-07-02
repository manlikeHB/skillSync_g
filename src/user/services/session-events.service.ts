import { Injectable } from '@nestjs/common';
import { ReputationService } from './reputation.service';

@Injectable()
export class SessionEventsService {
  constructor(private readonly reputationService: ReputationService) {}

  // Call this when a session is completed
  async onSessionCompleted(mentorId: string) {
    await this.reputationService.updateMentorReputation(mentorId);
  }
}
