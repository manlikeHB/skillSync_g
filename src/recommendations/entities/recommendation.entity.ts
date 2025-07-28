import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('recommendations')
export class Recommendation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  requesterId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requesterId' })
  requester: User;

  @Column()
  recommendedUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'recommendedUserId' })
  recommendedUser: User;

  @Column({ type: 'enum', enum: ['mentor', 'mentee'] })
  type: 'mentor' | 'mentee';

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  matchScore: number;

  @Column({ type: 'json' })
  explanation: any;

  @Column({ type: 'json' })
  matchingFactors: any;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: false })
  viewed: boolean;

  @Column({ nullable: true })
  feedback: string;

  @Column({ type: 'enum', enum: ['pending', 'accepted', 'declined'], default: 'pending' })
  status: string;
}