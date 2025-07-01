import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity()
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.id)
  mentor: User;

  @ManyToOne(() => User, (user) => user.id)
  mentee: User;

  @Column()
  sessionId: string;

  @Column({ type: 'int', width: 1 })
  rating: number; // 1-5

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ type: 'int', default: 0 })
  qualityScore: number; // Calculated by system/admin

  @CreateDateColumn()
  createdAt: Date;
}
