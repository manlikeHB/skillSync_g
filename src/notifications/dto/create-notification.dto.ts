import { IsEnum, IsString, IsUUID, IsOptional, IsObject } from 'class-validator';
import { NotificationType } from '../entities/notification.entity';

export class CreateNotificationDto {
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsUUID()
  userId: string;

  @IsOptional()
  @IsUUID()
  matchId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
