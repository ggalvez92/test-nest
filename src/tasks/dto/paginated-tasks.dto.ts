import { ApiProperty } from '@nestjs/swagger';
import { TaskResponseDto } from './task-response.dto';

export class PaginatedTasksDto {
  @ApiProperty({
    description: 'Array of tasks',
    type: [TaskResponseDto],
  })
  data: TaskResponseDto[];

  @ApiProperty({
    description: 'Total number of tasks (without pagination)',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 50,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 3,
  })
  totalPages: number;
}
