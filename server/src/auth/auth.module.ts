// 6. AuthModule
// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { ResetToken } from './entities/reset-token.entity';
import { MailService } from 'src/mail/mail.service';
import { TokenBlacklistService } from './token-blacklist.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, ResetToken])],
  providers: [AuthService, TokenBlacklistService, MailService],
  controllers: [AuthController],
  export: [TokenBlacklistService, AuthService],
})
export class AuthModule {}