@Entity('matchings')
export class Matching {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  mentorId: string;

  @Column('uuid')
  menteeId: string;

  @Column({ type: 'float', default: 0 })
  compatibilityScore: number;

  @Column({ type: 'float', default: 0 })
  fairnessScore: number;

  @Column('json', { nullable: true })
  fairnessMetrics: FairnessMetrics;

  @Column({ type: 'enum', enum: ['pending', 'active', 'completed', 'cancelled'] })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}