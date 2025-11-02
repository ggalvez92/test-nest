import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * RefreshDto - Data Transfer Object for token refresh
 */
export class RefreshDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token to validate and rotate',
  })
  @IsString()
  refreshToken: string; // The refresh token to validate and rotate
}
