import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { MenteePreferenceService } from '../services/mentee-preference.service';
import { CreateMenteePreferenceDto, UpdateMenteePreferenceDto, MenteePreferenceResponseDto } from '../dto/mentee-preference.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard'; // Assume you have this

@Controller('mentee-preferences')
@UseGuards(JwtAuthGuard)
export class MenteePreferenceController {
  constructor(private readonly preferenceService: MenteePreferenceService) {}

  @Post()
  async createPreference(
    @Request() req,
    @Body() dto: CreateMenteePreferenceDto
  ): Promise<MenteePreferenceResponseDto> {
    return this.preferenceService.createPreference(req.user.id, dto);
  }

  @Get()
  async getMyPreferences(@Request() req): Promise<MenteePreferenceResponseDto[]> {
    return this.preferenceService.getMenteePreferences(req.user.id);
  }

  @Put(':id')
  async updatePreference(
    @Request() req,
    @Param('id') preferenceId: string,
    @Body() dto: UpdateMenteePreferenceDto
  ): Promise<MenteePreferenceResponseDto> {
    return this.preferenceService.updatePreference(req.user.id, preferenceId, dto);
  }

  @Delete(':id')
  async deletePreference(
    @Request() req,
    @Param('id') preferenceId: string
  ): Promise<{ message: string }> {
    await this.preferenceService.deletePreference(req.user.id, preferenceId);
    return { message: 'Preference deleted successfully' };
  }
}
