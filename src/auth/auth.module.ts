import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategy/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { CategoriesModule } from '../categories/categories.module';

/**
 * AuthModule - Configures authentication with JWT and Passport
 */
@Module({
  imports: [
    UsersModule, // Import to access UsersService
    CategoriesModule, // Import to access CategoriesService
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          // Default expiration, but each token type uses its own
          expiresIn: configService.get<string>('ACCESS_TOKEN_EXPIRES_IN', '15m'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService], // Export if needed elsewhere
})
export class AuthModule {}
