import { Controller, Get, Param, Patch, Body, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('reputation')
export class ReputationAdminController {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  @Get(':mentorId')
  async getReputation(@Param('mentorId') mentorId: string) {
    const user = await this.userRepository.findOne({ where: { id: mentorId } });
    return { reputationScore: user?.reputationScore ?? 0 };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':mentorId')
  async adjustReputation(
    @Param('mentorId') mentorId: string,
    @Body('score') score: number,
  ) {
    await this.userRepository.update(mentorId, { reputationScore: score });
    return { success: true };
  }
}
