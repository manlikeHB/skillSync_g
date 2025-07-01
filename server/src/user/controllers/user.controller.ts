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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from '../services/user.service';
import { RegisterUserDto } from '../dto/register-user.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from '../enums/user-role.enum';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

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
}
