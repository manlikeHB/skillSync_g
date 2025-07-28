import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm"
import { LogLevel, LogCategory } from "../interfaces/log.interface"

@Entity("logs")
@Index(["level"])
@Index(["category"])
@Index(["userId"])
@Index(["correlationId"])
@Index(["createdAt"])
export class Log {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "enum", enum: LogLevel, default: LogLevel.INFO })
  level: LogLevel

  @Column({ type: "enum", enum: LogCategory, default: LogCategory.SYSTEM })
  category: LogCategory

  @Column({ type: "text" })
  message: string

  @Column({ type: "varchar", length: 255, nullable: true })
  context: string

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @Column({ type: "varchar", length: 255, nullable: true })
  userId: string

  @Column({ type: "varchar", length: 255, nullable: true })
  correlationId: string

  @CreateDateColumn()
  createdAt: Date
}
