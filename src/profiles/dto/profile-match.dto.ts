import { IsString, IsEnum } from 'class-validator';

export class ProfileMatchDto {
  @IsString()
  userId: string;

  @IsEnum(['mentor', 'mentee'])
  userType: 'mentor' | 'mentee';
}