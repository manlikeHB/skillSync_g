import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('feature_vectors')
@Index(['userId', 'userType'])
@Index(['lastUpdated'])
export class FeatureVector {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: ['mentor', 'mentee'] })
  userType: string;

  @Column({ type: 'jsonb' })
  features: {
    skillsVector: number[];
    experienceVector: number[];
    availabilityVector: number[];
    preferenceVector: number[];
    reputationVector: number[];
    engagementVector: number[];
  };

  @Column({ type: 'float', default: 0 })
  qualityScore: number;

  @Column({ default: '1.0' })
  version: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  lastUpdated: Date;
}
