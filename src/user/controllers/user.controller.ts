import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Patch,
  Request,
  Get,
  ForbiddenException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from '../services/user.service';
import { RegisterUserDto } from '../dto/register-user.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from '../enums/user-role.enum';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly httpService: HttpService,
  ) {}

  @Post('register')
  @UseInterceptors(FileInterceptor('credentialFile'))
  async register(
    @Body() dto: RegisterUserDto,
    @UploadedFile() file: any, // Changed from Express.Multer.File to any
  ) {
    // TODO: Upload file to S3/Cloudinary and get URL
    const credentialFileUrl = file ? `uploaded/${file.originalname}` : undefined;
    return this.userService.register(dto, credentialFileUrl);
  }

  @Patch('profile')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MENTOR, UserRole.MENTEE)
  @UseInterceptors(FileInterceptor('credentialFile'))
  async updateProfile(
    @Request() req,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() file: any,
  ) {
    const credentialFileUrl = file ? `uploaded/${file.originalname}` : undefined;
    return this.userService.updateProfile(req.user.id, dto, credentialFileUrl);
  }

  @Get('profile')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MENTOR, UserRole.MENTEE)
  async getProfile(@Request() req) {
    return this.userService.findById(req.user.id);
  }

  @Get('recommend-mentors')
  async recommendMentors(
    @Query('menteeId') menteeId: string,
    @Query('n') n: string = '5',
  ) {
    const mentee = await this.userService.findById(menteeId);
    const menteeSkills = this.userService.extractSkills(mentee);
    const mentors = await this.userService.findAllMentors();

    // For each mentor, get semantic similarity score
    const mentorsWithScores = await Promise.all(
      mentors.map(async mentor => {
        const mentorSkills = this.userService.extractSkills(mentor);
        let semanticSkillScore = 0;
        if (menteeSkills.length && mentorSkills.length) {
          const response: AxiosResponse<any> = await firstValueFrom(
            this.httpService.post('http://localhost:8001/similarity', {
              mentee_skills: menteeSkills,
              mentor_skills: mentorSkills,
            }),
          );
          semanticSkillScore = response.data.similarity;
        }
        return { ...mentor, semanticSkillScore };
      })
    );

    // Sort by semanticSkillScore (descending)
    mentorsWithScores.sort((a, b) => b.semanticSkillScore - a.semanticSkillScore);

    return { recommendations: mentorsWithScores.slice(0, Number(n)) };
  }
}
