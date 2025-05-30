import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: 'your-email@gmail.com',
      pass: 'your-password-or-app-password',
    },
  });

  async sendPasswordResetEmail(email: string, link: string) {
    await this.transporter.sendMail({
      from: 'SkillSync <your-email@gmail.com>',
      to: email,
      subject: 'Reset your password',
      html: `<p>Reset your password: <a href=\"${link}\">${link}</a></p>`
    });
  }
}