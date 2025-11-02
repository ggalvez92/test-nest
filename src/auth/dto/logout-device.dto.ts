import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * LogoutDeviceDto - Data Transfer Object for device-specific logout
 */
export class LogoutDeviceDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'JWT ID (jti) of the session to revoke',
  })
  @IsString()
  jti: string; // JWT ID of the session to revoke
}
