import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import serverlessExpress from '@vendia/serverless-express';

let server: ReturnType<typeof serverlessExpress>;

/**
 * Bootstrap the NestJS application for serverless deployment
 * Reuses the server instance across invocations for better performance
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'], // Reduce logging in serverless
  });

  // Enable CORS
  app.enableCors();

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Initialize the app (don't call app.listen in serverless)
  await app.init();

  // Get the underlying Express app
  const expressApp = app.getHttpAdapter().getInstance();

  // Wrap with serverless-express
  return serverlessExpress({ app: expressApp });
}

/**
 * Vercel serverless handler
 * Creates the server on first invocation, then reuses it
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (!server) {
    server = await bootstrap();
  }

  return server(req, res);
}
