import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ type: 'enum', enum: ['mentor', 'mentee', 'both'] })
  role: string;

  @Column('json', { nullable: true })
  skills: string[];

  @Column('json', { nullable: true })
  preferences: string[];

  @Column('json', { nullable: true })
  demographicInfo: DemographicInfo;

  @Column({ type: 'int', default: 0 })
  experienceYears: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
