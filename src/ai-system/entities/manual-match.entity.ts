import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"

@Entity("manual_matches")
@Index(["sourceUserId"])
@Index(["targetUserId"])
@Index(["adminUserId"])
@Index(["createdAt"])
export class ManualMatch {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "varchar", length: 255 })
  sourceUserId: string

  @Column({ type: "varchar", length: 255 })
  targetUserId: string

  @Column({ type: "float", nullable: true })
  overrideScore: number

  @Column({ type: "float", nullable: true })
  overrideConfidence: number

  @Column({ type: "text", nullable: true })
  reason: string

  @Column({ type: "varchar", length: 255 })
  adminUserId: string

  @Column({ type: "boolean", default: true })
  isActive: boolean

  @Column({ type: "uuid", nullable: true })
  originalMatchId: string // Reference to MatchingResultEntity if overriding an AI match

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
