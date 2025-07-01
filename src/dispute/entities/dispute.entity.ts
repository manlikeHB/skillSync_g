import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { DisputeEvidence } from './dispute-evidence.entity';
import { DisputeVote } from './dispute-vote.entity';
import { DisputeAuditLog } from './dispute-audit-log.entity';

export enum DisputeStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

@Entity()
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  initiator: User;

  @Column()
  contractId: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'enum', enum: DisputeStatus, default: DisputeStatus.PENDING })
  status: DisputeStatus;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => DisputeEvidence, (e) => e.dispute)
  evidence: DisputeEvidence[];

  @OneToMany(() => DisputeVote, (v) => v.dispute)
  votes: DisputeVote[];

  @OneToMany(() => DisputeAuditLog, (a) => a.dispute)
  auditLogs: DisputeAuditLog[];

  @Column({ type: 'jsonb', nullable: true })
  outcome: any;
}
