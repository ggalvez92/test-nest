import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsInt,
  IsArray,
  MaxLength,
  IsNotEmpty,
  Min,
  IsUUID,
} from 'class-validator';
import { TaskStatus, TaskPriority } from '@prisma/client';

export class CreateTaskDto {
  @ApiProperty({
    description: 'Task title',
    example: 'Complete project documentation',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({
    description: 'Detailed task description',
    example: 'Write comprehensive documentation for the API endpoints',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Task status',
    enum: TaskStatus,
    default: TaskStatus.PENDIENTE,
    example: TaskStatus.PENDIENTE,
  })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @ApiPropertyOptional({
    description: 'Task priority',
    enum: TaskPriority,
    default: TaskPriority.MEDIA,
    example: TaskPriority.MEDIA,
  })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiPropertyOptional({
    description: 'Task due date',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Estimated time to complete task (in minutes)',
    example: 120,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  estimatedTime?: number;

  @ApiPropertyOptional({
    description: 'Actual time spent on task (in minutes)',
    example: 90,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  actualTime?: number;

  @ApiPropertyOptional({
    description: 'Task tags',
    example: ['urgent', 'documentation'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Category ID to associate with the task',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  categoryId?: string;
}
