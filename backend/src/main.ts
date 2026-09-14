/**
 * Application bootstrap for the Dockwise backend.
 *
 * Ensures the application database exists, initializes the DataSource, runs the
 * idempotent seed, then starts the Nest HTTP server with CORS, a global
 * validation pipe, a consistent error filter, and the /api route prefix.
 */
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from './config/configuration';
import { AppDataSource } from './config/database.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

/**
 * Start the Dockwise API server.
 *
 * Returns:
 *   Resolves when the server is listening.
 */
async function bootstrap(): Promise<void> {
  // Initialize the shared DataSource. Demo data is seeded idempotently by the
  // root module's bootstrap hook (skipped for in-memory test databases).
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const app = await NestFactory.create(AppModule);

  // Business routes carry an explicit "v1/..." controller prefix and are
  // mounted under the global /api prefix -> /api/v1/<resource>. The health
  // controller has no prefix, so it serves /api/health.
  app.setGlobalPrefix('api');

  app.enableCors({
    origin: config.corsOrigin,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(config.port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`Dockwise API listening on port ${config.port}`);
}

void bootstrap();
