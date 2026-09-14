/**
 * SQLite connection for the Dockwise backend.
 *
 * Uses sql.js (a pure-WASM SQLite build) so no native compilation or database
 * server is required. The database is persisted to a file path read from the
 * environment; tests use an in-memory database. Exposes a singleton TypeORM
 * DataSource.
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from '../config/configuration';

/**
 * Create the singleton TypeORM DataSource for the application database.
 *
 * Returns:
 *   A configured (not yet initialized) DataSource backed by sql.js.
 */
export function createDataSource(): DataSource {
  return new DataSource({
    type: 'sqljs',
    location: config.dbPath,
    autoSave: true,
    entities: [__dirname + '/../**/*.entity.{ts,js}'],
    synchronize: true, // dev/local auto-DDL; production uses migrations
    logging: false,
  });
}

/** Singleton application DataSource. */
export const AppDataSource = createDataSource();
