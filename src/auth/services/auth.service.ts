import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { ResetToken } from '../entities/reset-token.entity';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(ResetToken) private tokenRepo: Repository<ResetToken>,
    private mailService: MailService
  ) {}

  async handleForgotPassword(email: string) {
    const user = await this.userRepo.findOneBy({ email });
    if (!user) throw new NotFoundException('Email not found');

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour

    await this.tokenRepo.save({ token, user, expiresAt });

    const resetLink = `https://your-frontend.com/reset-password?token=${token}`;
    await this.mailService.sendPasswordResetEmail(email, resetLink);

    return { message: 'Reset link sent to email' };
  }

  async handleResetPassword(token: string, newPassword: string) {
    const tokenRecord = await this.tokenRepo.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    tokenRecord.user.password = hashedPassword;

    await this.userRepo.save(tokenRecord.user);
    await this.tokenRepo.delete({ token });

    return { message: 'Password updated successfully' };
  }
}