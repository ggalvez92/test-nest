# NestJS Authentication System - Implementation Guide

## Overview

A production-ready authentication system for NestJS 11+ with:
- **Refresh Token Sessions** - Per-device session management (WEB/MOBILE)
- **JWT Access Tokens** - Short-lived (15m) for API access
- **Token Rotation** - Automatic refresh token rotation for security
- **Global Revoke** - `tokenVersion` kill switch to invalidate all tokens
- **Device-Level Revoke** - Revoke individual sessions
- **PostgreSQL on Neon** - Serverless database with Prisma ORM
- **Vercel Ready** - Serverless deployment configuration included

## Architecture

### Token Strategy
- **Access Token (AT)**: 15 minutes, JWT with `{ sub, tokenVersion }`
- **Refresh Token (RT)**: 7 days, JWT with `{ sub, tokenVersion, jti }`
  - Stored hashed (bcrypt) in `Session` table
  - Rotated on every refresh (old session revoked, new one created)
  - Verified by hash comparison on refresh

### Database Models
- **User**: `id`, `email`, `password` (hashed), `tokenVersion`
- **Session**: `jti`, `refreshHash`, `platform`, `deviceLabel`, `userAgent`, `ip`, `expiresAt`, `revokedAt`

## Setup Instructions

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment
Create `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

Required environment variables:
```env
DATABASE_URL="postgresql://user:pass@host.neon.tech/db?sslmode=require"
JWT_SECRET="your-super-secret-key"
ACCESS_TOKEN_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"
PORT="3000"
```

### 3. Set Up Database
```bash
# Generate Prisma client
pnpm prisma:generate

# Create and run initial migration
pnpm prisma:migrate:dev --name init

# Or for production (no prompts)
pnpm prisma:migrate:deploy
```

### 4. Build and Run

**Development:**
```bash
pnpm start:dev
```

**Production (local):**
```bash
pnpm build
pnpm start
```

**Vercel Deployment:**
1. Set environment variables in Vercel dashboard
2. Push code to GitHub/GitLab
3. Connect to Vercel
4. Build command: `pnpm prisma:generate && pnpm build`
5. Deploy

## API Endpoints

### Authentication

#### Register
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

Response:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "createdAt": "2025-01-15T..."
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "platform": "WEB",
  "deviceLabel": "Chrome on Windows"
}
```

Response:
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

#### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

Response:
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

#### Logout Device
```http
POST /auth/logout-device
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "jti": "session-jti-uuid"
}
```

Response:
```json
{
  "message": "Device logged out successfully"
}
```

#### Revoke All Sessions
```http
POST /auth/revoke
Authorization: Bearer <accessToken>
```

Response:
```json
{
  "message": "All sessions revoked successfully"
}
```

### Users

#### Get Current User
```http
GET /users/me
Authorization: Bearer <accessToken>
```

Response:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "createdAt": "2025-01-15T...",
  "updatedAt": "2025-01-15T..."
}
```

## Security Features

### 1. Refresh Token Hash Verification
- Refresh tokens are hashed with bcrypt (12 rounds) before storage
- On refresh, the provided token is compared against stored hash
- Prevents token theft/reuse if database is compromised

### 2. Token Rotation
- Every refresh invalidates the old RT and issues a new one
- Old session is marked `revokedAt = now()`
- Prevents token reuse attacks

### 3. Reuse Detection
- If a revoked RT is presented → 401 Unauthorized
- Client must re-login (no auto-revoke to avoid DoS)

### 4. Global Revoke (Kill Switch)
- Increment `user.tokenVersion` to invalidate all tokens
- JWT strategy validates `payload.tokenVersion === user.tokenVersion`
- All existing ATs and RTs become invalid instantly

### 5. Device-Level Revoke
- Mark specific session as revoked without affecting other devices
- User can logout individual sessions

## Implementation Details

### File Structure
```
src/
├── main.ts                          # App bootstrap with CORS & validation
├── app.module.ts                    # Root module
├── prisma/
│   ├── prisma.module.ts             # Global Prisma module
│   └── prisma.service.ts            # Prisma client wrapper
├── users/
│   ├── users.module.ts
│   ├── users.service.ts             # User CRUD + bumpTokenVersion
│   └── users.controller.ts          # GET /users/me
├── auth/
│   ├── auth.module.ts               # JWT & Passport setup
│   ├── auth.service.ts              # Core auth logic
│   ├── auth.controller.ts           # Auth endpoints
│   ├── dto/
│   │   ├── register.dto.ts
│   │   ├── login.dto.ts
│   │   ├── refresh.dto.ts
│   │   └── logout-device.dto.ts
│   ├── strategy/
│   │   └── jwt.strategy.ts          # Passport JWT + tokenVersion check
│   └── guards/
│       └── jwt-auth.guard.ts        # Auth guard for protected routes
└── common/
    └── decorators/
        └── get-user.decorator.ts    # @GetUser() decorator

api/
└── index.ts                         # Vercel serverless entry

prisma/
└── schema.prisma                    # Database schema

vercel.json                          # Vercel deployment config
.env.example                         # Environment template
```

### Key Code Locations

- **Password hashing**: `auth.service.ts:56` (register), `auth.service.ts:82` (login)
- **Session creation**: `auth.service.ts:108-119`
- **Token rotation**: `auth.service.ts:207-229`
- **Hash verification**: `auth.service.ts:174-177`
- **tokenVersion check**: `strategy/jwt.strategy.ts:46-50`

## Testing with cURL

### Register
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","platform":"WEB"}'
```

### Access Protected Route
```bash
curl http://localhost:3000/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Refresh Token
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
```

## Troubleshooting

### Common Issues

1. **"Invalid or expired refresh token"**
   - RT expired (7 days)
   - RT was already used (rotation)
   - User's tokenVersion was incremented
   - Solution: Re-login

2. **"Token has been globally revoked"**
   - User called `/auth/revoke`
   - Solution: Re-login

3. **"User not found"**
   - User was deleted
   - JWT signature valid but user missing
   - Solution: Re-register

4. **Prisma connection errors**
   - Check DATABASE_URL format
   - Ensure Neon connection string includes `?sslmode=require`
   - Verify network access to Neon

## Production Checklist

- [ ] Set strong `JWT_SECRET` (min 32 chars, random)
- [ ] Configure Neon connection pooling
- [ ] Set up database backups
- [ ] Enable HTTPS only (Vercel handles this)
- [ ] Set appropriate CORS origins in `main.ts`
- [ ] Monitor session table size (cleanup old sessions periodically)
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Add rate limiting (optional)
- [ ] Configure environment variables in Vercel

## Next Steps

### Optional Enhancements
1. **Email verification** - Send verification email on registration
2. **Password reset** - Forgot password flow
3. **Session cleanup** - Cron job to delete expired sessions
4. **Rate limiting** - Prevent brute force attacks
5. **2FA** - TOTP-based two-factor authentication
6. **Session management UI** - Frontend to view/revoke sessions
7. **OAuth providers** - Google, GitHub, etc.

## License

UNLICENSED
