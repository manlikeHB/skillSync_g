import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"

@Entity("matching_profiles")
@Index(["userId"])
@Index(["isActive"])
export class MatchingProfile {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "varchar", length: 255 })
  userId: string

  @Column({ type: "jsonb" })
  attributes: Record<string, any>

  @Column({ type: "jsonb" })
  preferences: Record<string, any>

  @Column({ type: "jsonb", default: {} })
  weights: Record<string, number>

  @Column({ type: "jsonb", default: {} })
  filters: Record<string, any>

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, any>

  @Column({ type: "boolean", default: true })
  isActive: boolean

  @Column({ type: "float", default: 0 })
  averageScore: number

  @Column({ type: "int", default: 0 })
  matchCount: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
