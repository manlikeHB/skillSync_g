import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Match } from './match.entity';

export enum FeedbackType {
  MATCH_QUALITY = 'match_quality',
  COMMUNICATION = 'communication',
  GOAL_ACHIEVEMENT = 'goal_achievement',
  OVERALL_SATISFACTION = 'overall_satisfaction'
}

@Entity('feedback')
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Match, match => match.feedback)
  @JoinColumn({ name: 'match_id' })
  match: Match;

  @Column({ name: 'match_id' })
  matchId: string;

  @ManyToOne(() => User, user => user.givenFeedback)
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: User;

  @Column({ name: 'reviewer_id' })
  reviewerId: string;

  @Column({ type: 'enum', enum: FeedbackType })
  type: FeedbackType;

  @Column({ type: 'int', comment: 'Rating from 1-5' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column('jsonb', { nullable: true })
  tags: string[];

  @Column('jsonb', { nullable: true })
  specificFeedback: {
    skillsMatched?: boolean;
    communicationEffective?: boolean;
    goalsAligned?: boolean;
    timeCommitmentMet?: boolean;
    wouldRecommend?: boolean;
  };

  @Column({ default: false })
  isAnonymous: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}