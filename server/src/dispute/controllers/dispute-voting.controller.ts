import { Controller, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { DisputeVotingService } from '../services/dispute-voting.service';
import { CastVoteDto } from '../dto/cast-vote.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('disputes/:id/votes')
export class DisputeVotingController {
  constructor(private readonly votingService: DisputeVotingService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async castVote(@Param('id') id: string, @Body() dto: CastVoteDto, @Request() req) {
    return this.votingService.castVote(id, req.user, dto);
  }
}
