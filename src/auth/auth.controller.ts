import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDeviceDto } from './dto/logout-device.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { GetJti } from '../common/decorators/get-jti.decorator';
import type { User } from '@prisma/client';
import type { Request } from 'express';

/**
 * AuthController - Handles authentication endpoints
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * POST /auth/register
   * Register a new user account
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 409, description: 'User with this email already exists' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * POST /auth/login
   * Login and create a new session
   * Returns access token and refresh token
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and create a new session' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'user@example.com',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    // Extract metadata from request
    const metadata = {
      platform: dto.platform,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.socket.remoteAddress,
      deviceLabel: dto.deviceLabel,
    };

    return this.authService.login(dto, metadata);
  }

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   * Implements token rotation - returns new AT and RT
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto);
  }

  /**
   * POST /auth/logout
   * Logout the current session
   * Extracts session info from the access token
   * Requires authentication (access token)
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout current session' })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
    schema: {
      example: {
        message: 'Logged out successfully',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 400, description: 'Session not found or already logged out' })
  async logout(@GetUser() user: User, @GetJti() jti: string) {
    return this.authService.logout(user.id, jti);
  }

  /**
   * POST /auth/logout-device
   * Logout another device by revoking its session
   * Use this to logout a different device, not the current one
   * Requires authentication (access token)
   */
  @Post('logout-device')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout another device by revoking its session' })
  @ApiResponse({
    status: 200,
    description: 'Device logged out successfully',
    schema: {
      example: {
        message: 'Device logged out successfully',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 400, description: 'Session not found' })
  async logoutDevice(@Body() dto: LogoutDeviceDto, @GetUser() user: User) {
    return this.authService.logoutDevice(dto, user.id);
  }

  /**
   * POST /auth/revoke
   * Revoke ALL sessions for the current user
   * Increments tokenVersion to invalidate all access and refresh tokens
   * Requires authentication (access token)
   */
  @Post('revoke')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Revoke all sessions for the current user' })
  @ApiResponse({
    status: 200,
    description: 'All sessions revoked successfully',
    schema: {
      example: {
        message: 'All sessions revoked successfully',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async revokeAll(@GetUser() user: User) {
    return this.authService.revokeAll(user.id);
  }
}
