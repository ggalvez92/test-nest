import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus, TaskPriority } from '@prisma/client';

export class TaskCategoryDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({ example: 'Work' })
  name: string;

  @ApiProperty({ example: '#3B82F6' })
  color: string;
}

export class TaskResponseDto {
  @ApiProperty({
    description: 'Task ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Task title',
    example: 'Complete project documentation',
  })
  title: string;

  @ApiPropertyOptional({
    description: 'Task description',
    example: 'Write comprehensive documentation for the API endpoints',
    nullable: true,
  })
  description?: string | null;

  @ApiProperty({
    description: 'Task status',
    enum: TaskStatus,
    example: TaskStatus.PENDIENTE,
  })
  status: TaskStatus;

  @ApiProperty({
    description: 'Task priority',
    enum: TaskPriority,
    example: TaskPriority.MEDIA,
  })
  priority: TaskPriority;

  @ApiPropertyOptional({
    description: 'Due date',
    example: '2024-12-31T23:59:59.000Z',
    nullable: true,
  })
  dueDate?: Date | null;

  @ApiPropertyOptional({
    description: 'Estimated time in minutes',
    example: 120,
    nullable: true,
  })
  estimatedTime?: number | null;

  @ApiPropertyOptional({
    description: 'Actual time spent in minutes',
    example: 90,
    nullable: true,
  })
  actualTime?: number | null;

  @ApiProperty({
    description: 'Task tags',
    example: ['urgent', 'documentation'],
    type: [String],
  })
  tags: string[];

  @ApiProperty({
    description: 'User ID who owns this task',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  userId: string;

  @ApiPropertyOptional({
    description: 'Associated category',
    type: TaskCategoryDto,
    nullable: true,
  })
  category?: TaskCategoryDto | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
