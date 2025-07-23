import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { MenteePreference } from './mentee-preference.entity';
import { MatchingProfile } from './matching-profile.entity';

export enum UserRole {
  MENTEE = 'mentee',
  MENTOR = 'mentor',
  BOTH = 'both'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.MENTEE
  })
  role: UserRole;

  @Column('text', { array: true, default: [] })
  skills: string[];

  @Column('text', { array: true, default: [] })
  interests: string[];

  @Column({ nullable: true })
  bio: string;

  @Column({ nullable: true })
  profileImage: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => MenteePreference, preference => preference.mentee)
  preferences: MenteePreference[];

  @OneToMany(() => MenteePreference, preference => preference.preferredMentor)
  receivedPreferences: MenteePreference[];

  @OneToMany(() => MatchingProfile, profile => profile.user)
  matchingProfiles: MatchingProfile[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
