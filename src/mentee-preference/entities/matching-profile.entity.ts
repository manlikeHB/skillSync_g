import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('matching_profiles')
export class MatchingProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.matchingProfiles)
  user: User;

  @Column()
  userId: string;

  @Column('text', { array: true, default: [] })
  expertiseAreas: string[];

  @Column('text', { array: true, default: [] })
  learningGoals: string[];

  @Column('text', { array: true, default: [] })
  availableTimes: string[];

  @Column({ nullable: true })
  experienceLevel: string;

  @Column({ type: 'json', nullable: true })
  preferences: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}