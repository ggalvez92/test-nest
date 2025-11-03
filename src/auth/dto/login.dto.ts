import { IsEmail, IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SessionPlatform } from '@prisma/client';

/**
 * LoginDto - Data Transfer Object for user login
 */
export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'User password',
  })
  @IsString()
  password: string;

  @ApiProperty({
    enum: SessionPlatform,
    example: SessionPlatform.WEB,
    description: 'Platform from which the user is logging in',
  })
  @IsEnum(SessionPlatform)
  platform: SessionPlatform; // WEB or MOBILE

  @ApiProperty({
    example: 'Chrome on Windows',
    description: 'Optional device label for identification',
    required: false,
  })
  @IsOptional()
  @IsString()
  deviceLabel?: string; // Optional device name like "iPhone 13" or "Chrome on Windows"
}
