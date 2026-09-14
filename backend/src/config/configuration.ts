/**
 * Centralized, validated environment configuration for the Dockwise backend.
 *
 * Loads process env (via dotenv for local dev) and exposes a typed config
 * object. Fails fast at startup when a required variable is missing so a
 * misconfigured environment surfaces immediately rather than mid-request.
 */
import * as dotenv from 'dotenv';

dotenv.config();

export interface AppConfig {
  /** HTTP port the API listens on. */
  port: number;
  /** Node environment (development | production | test). */
  nodeEnv: string;
  /** Filesystem path of the SQLite database file. */
  dbPath: string;
  /** Secret used to sign JWT access tokens. */
  jwtSecret: string;
  /** Office-session token lifetime (e.g. "12h"). */
  jwtExpiresIn: string;
  /** Gate/dock shared-device session lifetime (e.g. "16h"). */
  deviceSessionExpiresIn: string;
  /** Allowed CORS origin for the frontend dev server. */
  corsOrigin: string;
  /** Whether to seed demo data idempotently on startup. */
  seedOnStartup: boolean;
  /** Whether Entra ID SSO is enabled for Meridian employees. */
  entraSsoEnabled: boolean;
  /** SMS provider API key (delivery is logged to an outbox in v1). */
  smsProviderApiKey: string;
  /** Email provider API key (delivery is logged to an outbox in v1). */
  emailProviderApiKey: string;
}

/**
 * Read a required environment variable or throw when absent.
 *
 * Args:
 *   key: The environment variable name.
 *   fallback: Optional default used when the variable is unset.
 *
 * Returns:
 *   The resolved string value.
 *
 * Raises:
 *   Error: When the variable is missing and no fallback is provided.
 */
function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Build the typed application configuration from the process environment.
 *
 * Returns:
 *   A validated AppConfig. Never logs secrets.
 */
export function loadConfig(): AppConfig {
  return {
    port: parseInt(requireEnv('PORT', '3001'), 10),
    nodeEnv: requireEnv('NODE_ENV', 'development'),
    dbPath: requireEnv('DB_PATH', 'dockwise.db'),
    jwtSecret: requireEnv('JWT_SECRET'),
    jwtExpiresIn: requireEnv('JWT_EXPIRES_IN', '12h'),
    deviceSessionExpiresIn: requireEnv('DEVICE_SESSION_EXPIRES_IN', '16h'),
    corsOrigin: requireEnv('CORS_ORIGIN', 'http://localhost:5173'),
    seedOnStartup: requireEnv('SEED_ON_STARTUP', 'true') === 'true',
    entraSsoEnabled: requireEnv('ENTRA_SSO_ENABLED', 'false') === 'true',
    smsProviderApiKey: requireEnv(
      'SMS_PROVIDER_API_KEY',
      'dev-sms-key-change-in-production',
    ),
    emailProviderApiKey: requireEnv(
      'EMAIL_PROVIDER_API_KEY',
      'dev-email-key-change-in-production',
    ),
  };
}

/** Singleton application configuration. */
export const config = loadConfig();
