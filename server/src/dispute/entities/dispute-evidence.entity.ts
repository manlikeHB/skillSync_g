import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Dispute } from './dispute.entity';

@Entity()
export class DisputeEvidence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Dispute, (d) => d.evidence)
  dispute: Dispute;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  attachmentUrl: string;

  @CreateDateColumn()
  createdAt: Date;
}
