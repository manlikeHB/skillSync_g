import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';
import { User } from './user.entity';

export enum PreferenceType {
  PREFERRED = 'preferred',
  BLOCKED = 'blocked'
}

@Entity('mentee_preferences')
@Unique(['mentee', 'preferredMentor'])
export class MenteePreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.preferences)
  mentee: User;

  @Column()
  menteeId: string;

  @ManyToOne(() => User, user => user.receivedPreferences)
  preferredMentor: User;

  @Column()
  preferredMentorId: string;

  @Column({
    type: 'enum',
    enum: PreferenceType,
    default: PreferenceType.PREFERRED
  })
  type: PreferenceType;

  @Column({ type: 'int', default: 1, comment: 'Higher values = stronger preference' })
  weight: number;

  @Column({ nullable: true })
  reason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}