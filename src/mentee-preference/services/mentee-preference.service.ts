import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenteePreference, PreferenceType } from '../entities/mentee-preference.entity';
import { User, UserRole } from '../entities/user.entity';
import { CreateMenteePreferenceDto, UpdateMenteePreferenceDto, MenteePreferenceResponseDto } from '../dto/mentee-preference.dto';

@Injectable()
export class MenteePreferenceService {
  constructor(
    @InjectRepository(MenteePreference)
    private preferenceRepository: Repository<MenteePreference>,
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  async createPreference(menteeId: string, dto: CreateMenteePreferenceDto): Promise<MenteePreferenceResponseDto> {
    // Validate mentee exists and has mentee role
    const mentee = await this.userRepository.findOne({ where: { id: menteeId } });
    if (!mentee) {
      throw new NotFoundException('Mentee not found');
    }
    if (mentee.role !== UserRole.MENTEE && mentee.role !== UserRole.BOTH) {
      throw new ForbiddenException('User is not authorized to create mentee preferences');
    }

    // Validate preferred mentor exists and has mentor role
    const preferredMentor = await this.userRepository.findOne({ where: { id: dto.preferredMentorId } });
    if (!preferredMentor) {
      throw new NotFoundException('Preferred mentor not found');
    }
    if (preferredMentor.role !== UserRole.MENTOR && preferredMentor.role !== UserRole.BOTH) {
      throw new ForbiddenException('Selected user is not a mentor');
    }

    // Check if preference already exists
    const existingPreference = await this.preferenceRepository.findOne({
      where: { menteeId, preferredMentorId: dto.preferredMentorId }
    });
    if (existingPreference) {
      throw new ConflictException('Preference already exists for this mentor');
    }

    // Create preference
    const preference = this.preferenceRepository.create({
      menteeId,
      preferredMentorId: dto.preferredMentorId,
      type: dto.type || PreferenceType.PREFERRED,
      weight: dto.weight || 1,
      reason: dto.reason
    });

    const saved = await this.preferenceRepository.save(preference);
    return this.formatPreferenceResponse(saved);
  }

  async updatePreference(menteeId: string, preferenceId: string, dto: UpdateMenteePreferenceDto): Promise<MenteePreferenceResponseDto> {
    const preference = await this.preferenceRepository.findOne({
      where: { id: preferenceId, menteeId },
      relations: ['preferredMentor']
    });

    if (!preference) {
      throw new NotFoundException('Preference not found');
    }

    Object.assign(preference, dto);
    const updated = await this.preferenceRepository.save(preference);
    return this.formatPreferenceResponse(updated);
  }

  async deletePreference(menteeId: string, preferenceId: string): Promise<void> {
    const result = await this.preferenceRepository.delete({ id: preferenceId, menteeId });
    if (result.affected === 0) {
      throw new NotFoundException('Preference not found');
    }
  }

  async getMenteePreferences(menteeId: string): Promise<MenteePreferenceResponseDto[]> {
    const preferences = await this.preferenceRepository.find({
      where: { menteeId },
      relations: ['preferredMentor'],
      order: { weight: 'DESC', createdAt: 'DESC' }
    });

    return preferences.map(p => this.formatPreferenceResponse(p));
  }

  async getPreferencesByMentor(mentorId: string): Promise<{ menteeId: string; type: PreferenceType; weight: number }[]> {
    const preferences = await this.preferenceRepository.find({
      where: { preferredMentorId: mentorId },
      select: ['menteeId', 'type', 'weight']
    });

    return preferences;
  }

  private formatPreferenceResponse(preference: MenteePreference): MenteePreferenceResponseDto {
    return {
      id: preference.id,
      menteeId: preference.menteeId,
      preferredMentorId: preference.preferredMentorId,
      type: preference.type,
      weight: preference.weight,
      reason: preference.reason,
      preferredMentor: preference.preferredMentor ? {
        id: preference.preferredMentor.id,
        firstName: preference.preferredMentor.firstName,
        lastName: preference.preferredMentor.lastName,
        skills: preference.preferredMentor.skills,
        bio: preference.preferredMentor.bio,
        profileImage: preference.preferredMentor.profileImage
      } : undefined,
      createdAt: preference.createdAt,
      updatedAt: preference.updatedAt
    };
  }
}