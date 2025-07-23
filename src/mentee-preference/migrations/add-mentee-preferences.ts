import { MigrationInterface, QueryRunner, Table, Index, ForeignKey } from 'typeorm';

export class AddMenteePreferences1640000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'mentee_preferences',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'menteeId',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'preferredMentorId',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['preferred', 'blocked'],
            default: "'preferred'"
          },
          {
            name: 'weight',
            type: 'int',
            default: 1
          },
          {
            name: 'reason',
            type: 'text',
            isNullable: true
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          }
        ]
      }),
      true
    );

    // Create unique index to prevent duplicate preferences
    await queryRunner.createIndex(
      'mentee_preferences',
      new Index({
        name: 'IDX_UNIQUE_MENTEE_MENTOR',
        columnNames: ['menteeId', 'preferredMentorId'],
        isUnique: true
      })
    );

    // Create foreign key constraints
    await queryRunner.createForeignKey(
      'mentee_preferences',
      new ForeignKey({
        columnNames: ['menteeId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE'
      })
    );

    await queryRunner.createForeignKey(
      'mentee_preferences',
      new ForeignKey({
        columnNames: ['preferredMentorId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE'
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('mentee_preferences');
  }
}