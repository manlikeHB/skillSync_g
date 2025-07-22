import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Feedback } from './feedback.entity';

export enum MatchStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

@Entity('matches')
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.mentorMatches)
  @JoinColumn({ name: 'mentor_id' })
  mentor: User;

  @Column({ name: 'mentor_id' })
  mentorId: string;

  @ManyToOne(() => User, user => user.menteeMatches)
  @JoinColumn({ name: 'mentee_id' })
  mentee: User;

  @Column({ name: 'mentee_id' })
  menteeId: string;

  @Column({ type: 'enum', enum: MatchStatus, default: MatchStatus.PENDING })
  status: MatchStatus;

  @Column('jsonb', { nullable: true })
  matchingCriteria: {
    skillsMatch: number;
    interestsMatch: number;
    preferencesMatch: number;
    algorithmVersion: string;
  };

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  algorithmScore: number;

  @Column({ nullable: true })
  startDate: Date;

  @Column({ nullable: true })
  endDate: Date;

  @OneToMany(() => Feedback, feedback => feedback.match)
  feedback: Feedback[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
