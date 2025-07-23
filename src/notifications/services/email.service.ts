import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { NotificationType } from '../entities/notification.entity';

interface EmailTemplateData {
  recipientName: string;
  mentorName?: string;
  menteeName?: string;
  matchDetails?: any;
  actionUrl?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransporter({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: this.configService.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  async sendNotificationEmail(
    to: string,
    type: NotificationType,
    data: EmailTemplateData
  ): Promise<void> {
    try {
      const { subject, html } = this.getEmailTemplate(type, data);

      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM'),
        to,
        subject,
        html,
      });

      this.logger.log(`Email sent successfully to ${to} for ${type}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  private getEmailTemplate(type: NotificationType, data: EmailTemplateData) {
    switch (type) {
      case NotificationType.MATCH_CREATED:
        return {
          subject: '🎉 New Mentorship Match Created!',
          html: this.getMatchCreatedTemplate(data)
        };
      
      case NotificationType.MATCH_UPDATED:
        return {
          subject: '📝 Your Mentorship Match Has Been Updated',
          html: this.getMatchUpdatedTemplate(data)
        };
      
      case NotificationType.MATCH_CANCELLED:
        return {
          subject: '❌ Mentorship Match Cancelled',
          html: this.getMatchCancelledTemplate(data)
        };
      
      default:
        return {
          subject: 'Mentorship Platform Notification',
          html: this.getDefaultTemplate(data)
        };
    }
  }

  private getMatchCreatedTemplate(data: EmailTemplateData): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">🎉 Congratulations! You've been matched!</h2>
        
        <p>Hi ${data.recipientName},</p>
        
        <p>Great news! We've found a perfect match for you in our mentorship program.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Match Details:</h3>
          <p><strong>Mentor:</strong> ${data.mentorName}</p>
          <p><strong>Mentee:</strong> ${data.menteeName}</p>
        </div>
        
        <p>We encourage you to reach out to your match soon to start building this valuable relationship.</p>
        
        ${data.actionUrl ? `<a href="${data.actionUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Match Details</a>` : ''}
        
        <p>Best regards,<br>The Mentorship Team</p>
      </div>
    `;
  }

  private getMatchUpdatedTemplate(data: EmailTemplateData): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">📝 Your Mentorship Match Has Been Updated</h2>
        
        <p>Hi ${data.recipientName},</p>
        
        <p>Your mentorship match has been updated with new information.</p>
        
        ${data.actionUrl ? `<a href="${data.actionUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Updated Details</a>` : ''}
        
        <p>Best regards,<br>The Mentorship Team</p>
      </div>
    `;
  }

  private getMatchCancelledTemplate(data: EmailTemplateData): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">❌ Mentorship Match Cancelled</h2>
        
        <p>Hi ${data.recipientName},</p>
        
        <p>We wanted to inform you that your mentorship match has been cancelled.</p>
        
        <p>Don't worry - we'll continue working to find you the perfect match!</p>
        
        <p>Best regards,<br>The Mentorship Team</p>
      </div>
    `;
  }

  private getDefaultTemplate(data: EmailTemplateData): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Mentorship Platform Notification</h2>
        
        <p>Hi ${data.recipientName},</p>
        
        <p>You have a new notification from the mentorship platform.</p>
        
        <p>Best regards,<br>The Mentorship Team</p>
      </div>
    `;
  }
}
