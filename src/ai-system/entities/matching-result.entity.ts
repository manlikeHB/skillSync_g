// QuickEdit to add new columns to the existing MatchingResultEntity
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm"

@Entity("matching_results")
@Index(["sourceUserId"])
@Index(["targetUserId"])
@Index(["algorithm"])
@Index(["createdAt"])
export class MatchingResultEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "varchar", length: 255 })
  sourceUserId: string

  @Column({ type: "varchar", length: 255 })
  targetUserId: string

  @Column({ type: "float" })
  score: number

  @Column({ type: "float" })
  confidence: number

  @Column({ type: "varchar", length: 100 })
  algorithm: string

  @Column({ type: "jsonb" })
  reasons: string[]

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, any>

  @Column({ type: "jsonb" })
  criteria: Record<string, any>

  @Column({ type: "boolean", default: false }) // New column
  isOverridden: boolean

  @Column({ type: "uuid", nullable: true }) // New column
  overriddenByManualMatchId: string

  @CreateDateColumn()
  createdAt: Date
}
