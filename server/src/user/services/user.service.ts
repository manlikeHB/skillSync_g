import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { RegisterUserDto } from '../dto/register-user.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UserRole } from '../enums/user-role.enum';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async register(dto: RegisterUserDto, credentialFileUrl?: string): Promise<User> {
    if (dto.role === UserRole.MENTOR && !credentialFileUrl) {
      throw new ForbiddenException('Mentor must upload credentials');
    }
    const user = this.userRepository.create({
      ...dto,
      credentialFile: credentialFileUrl,
    });
    await this.userRepository.save(user);
    this.logger.log(`User registered: ${user.email} (${user.role})`);
    // Emit audit event here if needed
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto, credentialFileUrl?: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    Object.assign(user, dto);
    if (credentialFileUrl) user.credentialFile = credentialFileUrl;
    await this.userRepository.save(user);
    this.logger.log(`Profile updated: ${user.email}`);
    // Emit audit event here if needed
    return user;
  }

  async findById(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
