import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { NotificationService } from './services/notification.service';
import { EmailService } from './services/email.service';
import { NotificationController } from './notification.controller';
import { NotificationGateway } from './gateways/notification.gateway';
import { Notification } from './entities/notification.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    JwtModule.register({}), // Configure with your JWT settings
    UsersModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationService, EmailService, NotificationGateway],
  exports: [NotificationService],
})
export class NotificationModule {}