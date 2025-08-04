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
  import { ExperienceLevel } from '../../common/enums/user-role.enum';
  
  @Entity('mentee_profiles')
  export class MenteeProfile {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @OneToOne(() => User, (user) => user.menteeProfile)
    @JoinColumn()
    user: User;
  
    @Column('uuid')
    @Index()
    userId: string;
  
    @Column('text', { array: true, default: [] })
    interests: string[];
  
    @Column('text', { array: true, default: [] })
    targetIndustries: string[];
  
    @Column({
      type: 'enum',
      enum: ExperienceLevel,
      default: ExperienceLevel.BEGINNER,
    })
    currentLevel: ExperienceLevel;
  
    @Column('text', { array: true, default: [] })
    skillsToLearn: string[];
  
    @Column('text', { array: true, default: [] })
    careerGoals: string[];
  
    @Column({ nullable: true })
    currentRole: string;
  
    @Column({ nullable: true })
    currentCompany: string;
  
    @Column({ nullable: true })
    education: string;
  
    @Column('simple-json', { nullable: true })
    availability: {
      days: string[];
      timeSlots: string[];
      timezone: string;
    };
  
    @Column('text', { array: true, default: [] })
    preferredMentorshipStyle: string[];
  
    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    budget: number;
  
    @Column('text', { array: true, default: [] })
    languages: string[];
  
    @Column({ nullable: true })
    linkedinUrl: string;
  
    @Column({ nullable: true })
    githubUrl: string;
  
    @Column({ nullable: true })
    portfolioUrl: string;
  
    @Column({ default: true })
    isLookingForMentor: boolean;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }