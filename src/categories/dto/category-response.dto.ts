import { ApiProperty } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({
    description: 'Category ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Category name',
    example: 'Work',
  })
  name: string;

  @ApiProperty({
    description: 'Category color in hex format',
    example: '#3B82F6',
  })
  color: string;

  @ApiProperty({
    description: 'Category description',
    example: 'Tasks related to work and professional projects',
    required: false,
    nullable: true,
  })
  description?: string | null;

  @ApiProperty({
    description: 'User ID who owns this category',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  userId: string;

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
