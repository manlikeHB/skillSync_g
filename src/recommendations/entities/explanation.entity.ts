import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Recommendation } from './recommendation.entity';

@Entity('explanations')
export class Explanation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  recommendationId: string;

  @ManyToOne(() => Recommendation, recommendation => recommendation.explanations)
  @JoinColumn({ name: 'recommendationId' })
  recommendation: Recommendation;

  @Column({ type: 'int' })
  matchScore: number;

  @Column({ type: 'text' })
  primaryReason: string;

  @Column({ type: 'json' })
  factors: ExplanationFactor[];

  @Column({ type: 'json' })
  concerns: string[];

  @Column({ type: 'json' })
  advantages: string[];

  @Column({ type: 'text', nullable: true })
  additionalContext: string;

  @Column({ type: 'enum', enum: ['auto', 'manual', 'hybrid'], default: 'auto' })
  explanationType: 'auto' | 'manual' | 'hybrid';

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'json', nullable: true })
  metadata: any;
}

export interface ExplanationFactor {
  factor: string;
  weight: number;
  explanation: string;
  details: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
}