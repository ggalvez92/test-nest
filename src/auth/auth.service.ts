import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CategoriesService } from '../categories/categories.service';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDeviceDto } from './dto/logout-device.dto';
import { SessionPlatform } from '@prisma/client';

/**
 * Session metadata extracted from request
 */
interface SessionMetadata {
  platform: SessionPlatform;
  userAgent?: string;
  ip?: string;
  deviceLabel?: string;
}

/**
 * AuthService - Core authentication logic
 * Handles registration, login, refresh token rotation, and revocation
 */
@Injectable()
export class AuthService {
  private readonly BCRYPT_ROUNDS = 12;

  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private categoriesService: CategoriesService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Register new user
   * Hashes password with bcrypt and creates user record
   * Creates default categories for the new user
   */
  async register(dto: RegisterDto) {
    // Check if user already exists
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

    // Create user
    const user = await this.usersService.create({
      email: dto.email,
      password: hashedPassword,
    });

    // Create default categories for the user
    await this.categoriesService.createDefaultCategories(user.id);

    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  /**
   * Login user and create session
   * Returns access token (AT) and refresh token (RT)
   */
  async login(dto: LoginDto, metadata: SessionMetadata) {
    // Validate credentials
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const validPassword = await bcrypt.compare(dto.password, user.password);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate unique JTI for this session
    const jti = randomUUID();

    // Create refresh token
    const refreshToken = this.signRefresh({
      sub: user.id,
      tokenVersion: user.tokenVersion,
      jti,
    });

    // Hash refresh token for storage
    const refreshHash = await bcrypt.hash(refreshToken, this.BCRYPT_ROUNDS);

    // Calculate expiration
    const expiresIn = this.configService.get<string>(
      'REFRESH_TOKEN_EXPIRES_IN',
      '7d',
    );
    const expiresAt = this.calculateExpiration(expiresIn);

    // Create session in database
    await this.prisma.session.create({
      data: {
        userId: user.id,
        jti,
        refreshHash,
        platform: dto.platform,
        deviceLabel: dto.deviceLabel,
        userAgent: metadata.userAgent,
        ip: metadata.ip,
        expiresAt,
      },
    });

    // Generate access token with JTI
    const accessToken = this.signAccess({
      sub: user.id,
      tokenVersion: user.tokenVersion,
      jti,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  /**
   * Refresh access token using refresh token
   * Implements refresh token rotation for security
   */
  async refresh(dto: RefreshDto) {
    // Verify refresh token signature and expiration
    let payload: any;
    try {
      payload = this.jwtService.verify(dto.refreshToken);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const { sub: userId, tokenVersion, jti } = payload;

    // Load session from database
    const session = await this.prisma.session.findUnique({
      where: { jti },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    // Check if session is revoked
    if (session.revokedAt) {
      // Reuse detected - session was already used/revoked
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    // Check if session expired
    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    // Verify refresh token hash (protection against token theft)
    const validHash = await bcrypt.compare(dto.refreshToken, session.refreshHash);
    if (!validHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Verify tokenVersion matches user's current version
    if (tokenVersion !== session.user.tokenVersion) {
      throw new UnauthorizedException('Token has been globally revoked');
    }

    // === ROTATION: Revoke old session and create new one ===

    const newJti = randomUUID();

    // Generate new refresh token
    const newRefreshToken = this.signRefresh({
      sub: userId,
      tokenVersion: session.user.tokenVersion,
      jti: newJti,
    });

    const newRefreshHash = await bcrypt.hash(
      newRefreshToken,
      this.BCRYPT_ROUNDS,
    );

    const expiresIn = this.configService.get<string>(
      'REFRESH_TOKEN_EXPIRES_IN',
      '7d',
    );
    const newExpiresAt = this.calculateExpiration(expiresIn);

    // Atomic operation: revoke old and create new
    await this.prisma.$transaction([
      // Mark old session as revoked
      this.prisma.session.update({
        where: { id: session.id },
        data: {
          revokedAt: new Date(),
          replacedByJti: newJti,
        },
      }),
      // Create new session
      this.prisma.session.create({
        data: {
          userId,
          jti: newJti,
          refreshHash: newRefreshHash,
          platform: session.platform,
          deviceLabel: session.deviceLabel,
          userAgent: session.userAgent,
          ip: session.ip,
          expiresAt: newExpiresAt,
        },
      }),
    ]);

    // Generate new access token with new JTI
    const newAccessToken = this.signAccess({
      sub: userId,
      tokenVersion: session.user.tokenVersion,
      jti: newJti,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logout current session
   * Extracts JTI from the authenticated user's token payload
   */
  async logout(userId: string, jti: string) {
    const session = await this.prisma.session.findUnique({
      where: { jti },
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    // Ensure user owns this session
    if (session.userId !== userId) {
      throw new UnauthorizedException('Not authorized to revoke this session');
    }

    // Check if already revoked
    if (session.revokedAt) {
      throw new BadRequestException('Session already logged out');
    }

    // Revoke session
    await this.prisma.session.update({
      where: { jti },
      data: { revokedAt: new Date() },
    });

    return { message: 'Logged out successfully' };
  }

  /**
   * Logout specific device by revoking its session
   * Use this to logout another device, not the current one
   */
  async logoutDevice(dto: LogoutDeviceDto, userId: string) {
    const session = await this.prisma.session.findUnique({
      where: { jti: dto.jti },
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    // Ensure user owns this session
    if (session.userId !== userId) {
      throw new UnauthorizedException('Not authorized to revoke this session');
    }

    // Revoke session
    await this.prisma.session.update({
      where: { jti: dto.jti },
      data: { revokedAt: new Date() },
    });

    return { message: 'Device logged out successfully' };
  }

  /**
   * Revoke all sessions by incrementing tokenVersion
   * All existing access and refresh tokens become invalid
   */
  async revokeAll(userId: string) {
    await this.usersService.bumpTokenVersion(userId);
    return { message: 'All sessions revoked successfully' };
  }

  /**
   * Sign access token (short-lived)
   * Now includes JTI to identify the session
   */
  signAccess(payload: { sub: string; tokenVersion: number; jti: string }): string {
    return this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>(
        'ACCESS_TOKEN_EXPIRES_IN',
        '15m',
      ),
    });
  }

  /**
   * Sign refresh token (long-lived)
   */
  signRefresh(payload: {
    sub: string;
    tokenVersion: number;
    jti: string;
  }): string {
    return this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>(
        'REFRESH_TOKEN_EXPIRES_IN',
        '7d',
      ),
    });
  }

  /**
   * Calculate expiration date from duration string (e.g., "7d", "15m")
   */
  private calculateExpiration(duration: string): Date {
    const unit = duration.slice(-1);
    const value = parseInt(duration.slice(0, -1));

    const now = new Date();

    switch (unit) {
      case 's': // seconds
        return new Date(now.getTime() + value * 1000);
      case 'm': // minutes
        return new Date(now.getTime() + value * 60 * 1000);
      case 'h': // hours
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case 'd': // days
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      default:
        throw new Error(`Invalid duration format: ${duration}`);
    }
  }
}
