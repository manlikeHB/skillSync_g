import {
    Controller,
    Get,
    Query,
    Param,
    ParseUUIDPipe,
    UseGuards,
  } from '@nestjs/common';
  import { ProfilesService } from './profiles.service';
  import { ProfileFiltersDto } from './dto/profile-filters.dto';
  import { RolesGuard } from '../common/guards/roles.guard';
  
  @Controller('profiles')
  @UseGuards(RolesGuard)
  export class ProfilesController {
    constructor(private readonly profilesService: ProfilesService) {}
  
    @Get('mentors')
    findMentors(@Query() filters: ProfileFiltersDto) {
      return this.profilesService.findMentors(filters);
    }
  
    @Get('mentees')
    findMentees(@Query() filters: ProfileFiltersDto) {
      return this.profilesService.findMentees(filters);
    }
  
    @Get('match-score/:mentorId/:menteeId')
    calculateMatchScore(
      @Param('mentorId', ParseUUIDPipe) mentorId: string,
      @Param('menteeId', ParseUUIDPipe) menteeId: string,
    ) {
      return this.profilesService.calculateMatchScore(mentorId, menteeId);
    }
  
    @Get('recommendations/:userId/:userType')
    getRecommendedMatches(
      @Param('userId', ParseUUIDPipe) userId: string,
      @Param('userType') userType: 'mentor' | 'mentee',
    ) {
      return this.profilesService.getRecommendedMatches(userId, userType);
    }
  }