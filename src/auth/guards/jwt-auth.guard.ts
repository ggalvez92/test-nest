import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtAuthGuard - Protects routes requiring authentication
 * Use with @UseGuards(JwtAuthGuard) on controller methods
 *
 * This guard:
 * 1. Extracts JWT from Authorization header
 * 2. Validates signature and expiration
 * 3. Calls JwtStrategy.validate() to check tokenVersion
 * 4. Attaches user to request object
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
