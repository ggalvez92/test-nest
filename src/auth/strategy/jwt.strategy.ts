import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * JWT payload interface for access tokens
 */
interface JwtPayload {
  sub: string; // User ID
  tokenVersion: number; // Must match user's current tokenVersion
  jti: string; // Session ID
}

/**
 * JwtStrategy - Validates access tokens and checks tokenVersion
 * This is called automatically by JwtAuthGuard on protected routes
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Validate JWT payload and ensure tokenVersion matches
   * This method is called after JWT signature is verified
   */
  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Critical: Check if tokenVersion matches
    // If user.tokenVersion was incremented, all old tokens become invalid
    if (payload.tokenVersion !== user.tokenVersion) {
      throw new UnauthorizedException(
        'Token has been revoked (global logout)',
      );
    }

    // Critical: Check if session is still active (not revoked)
    const session = await this.prisma.session.findUnique({
      where: { jti: payload.jti },
    });

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    if (session.revokedAt) {
      throw new UnauthorizedException('Session has been logged out');
    }

    // Check if session expired
    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    // Attach both user and jti to request object
    // The user is accessible via @GetUser(), jti via @GetJti()
    return { ...user, jti: payload.jti };
  }
}
