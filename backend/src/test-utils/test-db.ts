/**
 * Test database helpers: a real SQLite (sql.js) DataSource for unit/API tests.
 *
 * Tests run against a dedicated in-memory SQLite database (never the dev
 * file). The schema is synchronized from the entities. No in-memory
 * repositories are used — all persistence goes through the real driver.
 */
import { DataSource } from 'typeorm';

/**
 * Create and initialize a DataSource bound to a fresh in-memory test database.
 *
 * Returns:
 *   An initialized DataSource with the schema synchronized from entities.
 */
export async function newTestDataSource(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: 'sqljs',
    location: undefined, // in-memory
    autoSave: false,
    entities: [__dirname + '/../../**/*.entity.ts'],
    synchronize: true,
    dropSchema: true,
    logging: false,
  });
  await dataSource.initialize();
  return dataSource;
}
