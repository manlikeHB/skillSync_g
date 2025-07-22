import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Match } from './match.entity';
import { Feedback } from './feedback.entity';

export enum UserRole {
  MENTOR = 'mentor',
  MENTEE = 'mentee',
  BOTH = 'both'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column('jsonb', { nullable: true })
  skills: string[];

  @Column('jsonb', { nullable: true })
  interests: string[];

  @Column('jsonb', { nullable: true })
  preferences: {
    communicationStyle?: string;
    meetingFrequency?: string;
    timeZone?: string;
    experience?: string;
  };

  @OneToMany(() => Match, match => match.mentor)
  mentorMatches: Match[];

  @OneToMany(() => Match, match => match.mentee)
  menteeMatches: Match[];

  @OneToMany(() => Feedback, feedback => feedback.reviewer)
  givenFeedback: Feedback[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}