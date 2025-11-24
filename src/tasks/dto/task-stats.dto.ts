import { ApiProperty } from '@nestjs/swagger';

export class TaskStatsByStatus {
  @ApiProperty({ example: 10 })
  PENDIENTE: number;

  @ApiProperty({ example: 5 })
  EN_PROGRESO: number;

  @ApiProperty({ example: 20 })
  COMPLETADA: number;

  @ApiProperty({ example: 2 })
  CANCELADA: number;
}

export class TaskStatsByPriority {
  @ApiProperty({ example: 5 })
  BAJA: number;

  @ApiProperty({ example: 15 })
  MEDIA: number;

  @ApiProperty({ example: 10 })
  ALTA: number;

  @ApiProperty({ example: 7 })
  URGENTE: number;
}

export class TaskStatsByCategory {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  categoryId: string | null;

  @ApiProperty({ example: 'Work', nullable: true })
  categoryName: string | null;

  @ApiProperty({ example: 15 })
  count: number;
}

export class TaskStatsDto {
  @ApiProperty({
    description: 'Total number of tasks',
    example: 37,
  })
  total: number;

  @ApiProperty({
    description: 'Tasks grouped by status',
    type: TaskStatsByStatus,
  })
  byStatus: TaskStatsByStatus;

  @ApiProperty({
    description: 'Tasks grouped by priority',
    type: TaskStatsByPriority,
  })
  byPriority: TaskStatsByPriority;

  @ApiProperty({
    description: 'Tasks grouped by category',
    type: [TaskStatsByCategory],
  })
  byCategory: TaskStatsByCategory[];

  @ApiProperty({
    description: 'Completion rate (percentage)',
    example: 54.05,
  })
  completionRate: number;

  @ApiProperty({
    description: 'Average completion time in days',
    example: 3.5,
    nullable: true,
    required: false,
  })
  averageCompletionTime?: number | null;
}
