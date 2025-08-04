import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    JoinColumn,
    Index,
  } from 'typeorm';
  import { User } from './user.entity';
  import { ExperienceLevel, AvailabilityStatus } from '../../common/enums/user-role.enum';
  
  @Entity('mentor_profiles')
  export class MentorProfile {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @OneToOne(() => User, (user) => user.mentorProfile)
    @JoinColumn()
    user: User;
  
    @Column('uuid')
    @Index()
    userId: string;
  
    @Column('text', { array: true, default: [] })
    skills: string[];
  
    @Column('text', { array: true, default: [] })
    industries: string[];
  
    @Column({
      type: 'enum',
      enum: ExperienceLevel,
      default: ExperienceLevel.INTERMEDIATE,
    })
    experienceLevel: ExperienceLevel;
  
    @Column({ type: 'int', default: 0 })
    yearsOfExperience: number;
  
    @Column({ nullable: true })
    currentPosition: string;
  
    @Column({ nullable: true })
    company: string;
  
    @Column('text', { array: true, default: [] })
    mentorshipAreas: string[];
  
    @Column({ type: 'int', default: 5 })
    maxMentees: number;
  
    @Column({ type: 'int', default: 0 })
    currentMentees: number;
  
    @Column({
      type: 'enum',
      enum: AvailabilityStatus,
      default: AvailabilityStatus.AVAILABLE,
    })
    availabilityStatus: AvailabilityStatus;
  
    @Column('simple-json', { nullable: true })
    availability: {
      days: string[];
      timeSlots: string[];
      timezone: string;
    };
  
    @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
    rating: number;
  
    @Column({ type: 'int', default: 0 })
    totalReviews: number;
  
    @Column({ default: false })
    isVerified: boolean;
  
    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    hourlyRate: number;
  
    @Column('text', { array: true, default: [] })
    languages: string[];
  
    @Column({ nullable: true })
    linkedinUrl: string;
  
    @Column({ nullable: true })
    githubUrl: string;
  
    @Column({ nullable: true })
    personalWebsite: string;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }