import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Dispute } from './dispute.entity';
import { User } from '../../user/entities/user.entity';

@Entity()
export class DisputeVote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Dispute, (d) => d.votes)
  dispute: Dispute;

  @ManyToOne(() => User)
  voter: User;

  @Column({ type: 'text' })
  decision: string;

  @Column({ type: 'text', nullable: true })
  justification: string;

  @CreateDateColumn()
  createdAt: Date;
}
