import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('pipeline_executions')
export class PipelineExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  pipelineId: string;

  @Column({
    type: 'enum',
    enum: ['running', 'completed', 'failed', 'cancelled'],
  })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, any>;

  @Column({ type: 'int', default: 0 })
  recordsProcessed: number;

  @Column({ type: 'int', default: 0 })
  recordsSuccessful: number;

  @Column({ type: 'int', default: 0 })
  recordsFailed: number;

  @Column({ type: 'jsonb', nullable: true })
  errorMessages: string[];

  @Column({ type: 'jsonb', nullable: true })
  performance: Record<string, number>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  startTime: Date;

  @UpdateDateColumn()
  endTime: Date;
}
