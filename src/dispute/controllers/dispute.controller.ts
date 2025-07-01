import { Controller, Post, Body, UseGuards, Request, Get, Param } from '@nestjs/common';
import { DisputeService } from '../services/dispute.service';
import { CreateDisputeDto } from '../dto/create-dispute.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('disputes')
export class DisputeController {
  constructor(private readonly disputeService: DisputeService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createDispute(@Body() dto: CreateDisputeDto, @Request() req) {
    return this.disputeService.createDispute(dto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getDispute(@Param('id') id: string, @Request() req) {
    return this.disputeService.getDispute(id, req.user);
  }
}
