import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType, NotificationStatus } from '../entities/notification.entity';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { UpdateNotificationDto } from '../dto/update-notification.dto';
import { NotificationQueryDto } from '../dto/notification-query.dto';
import { EmailService } from './email.service';
import { NotificationGateway } from '../gateways/notification.gateway';
import { UsersService } from '../../users/users.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private emailService: EmailService,
    private notificationGateway: NotificationGateway,
    private usersService: UsersService,
  ) {}

  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create(createNotificationDto);
    const savedNotification = await this.notificationRepository.save(notification);

    // Send real-time notification
    this.notificationGateway.sendNotificationToUser(
      savedNotification.userId,
      savedNotification
    );

    // Send email notification
    try {
      const user = await this.usersService.findOne(savedNotification.userId);
      if (user?.email) {
        await this.emailService.sendNotificationEmail(
          user.email,
          savedNotification.type,
          {
            recipientName: user.name,
            ...savedNotification.metadata,
          }
        );
      }
    } catch (error) {
      this.logger.error('Failed to send email notification:', error);
    }

    return savedNotification;
  }

  async findAllForUser(
    userId: string,
    query: NotificationQueryDto
  ): Promise<{ notifications: Notification[]; total: number; page: number; totalPages: number }> {
    const { type, status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC');

    if (type) {
      queryBuilder.andWhere('notification.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('notification.status = :status', { status });
    }

    const [notifications, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      notifications,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async update(
    id: string,
    userId: string,
    updateNotificationDto: UpdateNotificationDto
  ): Promise<Notification> {
    const notification = await this.findOne(id, userId);
    Object.assign(notification, updateNotificationDto);
    return this.notificationRepository.save(notification);
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    return this.update(id, userId, { status: NotificationStatus.READ });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, status: NotificationStatus.UNREAD },
      { status: NotificationStatus.READ }
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, status: NotificationStatus.UNREAD },
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    const notification = await this.findOne(id, userId);
    await this.notificationRepository.remove(notification);
  }

  // Match-specific notification methods
  async notifyMatchCreated(matchId: string, mentorId: string, menteeId: string, matchDetails: any): Promise<void> {
    const mentor = await this.usersService.findOne(mentorId);
    const mentee = await this.usersService.findOne(menteeId);

    // Notify mentor
    await this.create({
      type: NotificationType.MATCH_CREATED,
      title: '🎉 New Mentee Matched!',
      message: `You've been matched with ${mentee.name} as a mentee. Start building this valuable relationship!`,
      userId: mentorId,
      matchId,
      metadata: {
        mentorName: mentor.name,
        menteeName: mentee.name,
        matchDetails,
        actionUrl: `${process.env.CLIENT_URL}/matches/${matchId}`,
      },
    });

    // Notify mentee
    await this.create({
      type: NotificationType.MATCH_CREATED,
      title: '🎉 New Mentor Matched!',
      message: `You've been matched with ${mentor.name} as a mentor. Get ready to learn and grow!`,
      userId: menteeId,
      matchId,
      metadata: {
        mentorName: mentor.name,
        menteeName: mentee.name,
        matchDetails,
        actionUrl: `${process.env.CLIENT_URL}/matches/${matchId}`,
      },
    });
  }

  async notifyMatchUpdated(matchId: string, mentorId: string, menteeId: string, updateDetails: any): Promise<void> {
    const baseNotification = {
      type: NotificationType.MATCH_UPDATED,
      title: '📝 Match Updated',
      message: 'Your mentorship match has been updated with new information.',
      matchId,
      metadata: {
        updateDetails,
        actionUrl: `${process.env.CLIENT_URL}/matches/${matchId}`,
      },
    };

    // Notify both mentor and mentee
    await Promise.all([
      this.create({ ...baseNotification, userId: mentorId }),
      this.create({ ...baseNotification, userId: menteeId }),
    ]);
  }

  async notifyMatchCancelled(matchId: string, mentorId: string, menteeId: string, reason?: string): Promise<void> {
    const baseNotification = {
      type: NotificationType.MATCH_CANCELLED,
      title: '❌ Match Cancelled',
      message: reason ? `Your mentorship match has been cancelled. Reason: ${reason}` : 'Your mentorship match has been cancelled.',
      matchId,
      metadata: { reason },
    };

    // Notify both mentor and mentee
    await Promise.all([
      this.create({ ...baseNotification, userId: mentorId }),
      this.create({ ...baseNotification, userId: menteeId }),
    ]);
  }
}
