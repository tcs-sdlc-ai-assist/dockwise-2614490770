/**
 * Jest global setup: forces the test database to in-memory SQLite before any
 * application module (and its config) is loaded.
 *
 * Registered via setupFiles so it runs before the test framework and any
 * module imports in each test file.
 */

// Force an isolated in-memory database for every test suite.
process.env.DB_PATH = ':memory:';
process.env.SEED_ON_STARTUP = 'false';
