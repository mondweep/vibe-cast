import { Logger } from '../logging/Logger';

/**
 * SupabaseConfig
 *
 * Validates and manages Supabase configuration
 * Ensures all required credentials are present and valid
 * Uses modern Supabase pattern (publishable/secret keys, not anon/service_role)
 *
 * Required environment variables:
 * - SUPABASE_URL: Project URL
 * - SUPABASE_PUBLISHABLE_KEY: Public key for browser/client
 * - SUPABASE_SECRET_KEY: Secret key for backend operations (NEVER expose to client)
 * - DATABASE_SCHEMA: Schema name (default: ruflo_demo)
 *
 * Validation happens on initialization
 * Throws ConfigurationError if any required variables are missing
 */
export class SupabaseConfig {
  private logger: Logger;

  readonly url: string;
  readonly publishableKey: string;
  readonly secretKey: string;
  readonly schema: string;
  readonly databaseUrl?: string;

  constructor(logger: Logger) {
    this.logger = logger;

    // Load and validate configuration
    this.url = this.getEnvVariable('SUPABASE_URL');
    this.publishableKey = this.getEnvVariable('SUPABASE_PUBLISHABLE_KEY');
    this.secretKey = this.getEnvVariable('SUPABASE_SECRET_KEY');
    this.schema = this.getEnvVariable('DATABASE_SCHEMA', 'ruflo_demo');
    this.databaseUrl = process.env.DATABASE_URL;

    // Validate format
    this.validate();
  }

  /**
   * Get environment variable with optional default
   * Throws if required variable is missing
   */
  private getEnvVariable(name: string, defaultValue?: string): string {
    const value = process.env[name] || defaultValue;

    if (!value) {
      throw new ConfigurationError(
        `Missing required environment variable: ${name}`,
        name
      );
    }

    return value;
  }

  /**
   * Validate configuration values
   */
  private validate(): void {
    // Validate URL format
    if (!this.url.startsWith('https://') || !this.url.includes('supabase.co')) {
      throw new ConfigurationError(
        `Invalid SUPABASE_URL format. Expected https://your-project.supabase.co, got: ${this.url}`,
        'SUPABASE_URL'
      );
    }

    // Validate publishable key format
    if (!this.publishableKey.startsWith('sb_publishable_')) {
      throw new ConfigurationError(
        `Invalid SUPABASE_PUBLISHABLE_KEY format. Must start with 'sb_publishable_'`,
        'SUPABASE_PUBLISHABLE_KEY'
      );
    }

    // Validate secret key format
    if (!this.secretKey.startsWith('sb_secret_')) {
      throw new ConfigurationError(
        `Invalid SUPABASE_SECRET_KEY format. Must start with 'sb_secret_'`,
        'SUPABASE_SECRET_KEY'
      );
    }

    // Validate schema name
    if (!this.schema.match(/^[a-z_][a-z0-9_]*$/)) {
      throw new ConfigurationError(
        `Invalid DATABASE_SCHEMA. Must be a valid PostgreSQL identifier (lowercase, alphanumeric and underscores), got: ${this.schema}`,
        'DATABASE_SCHEMA'
      );
    }

    this.logger.info('Supabase configuration validated', {
      url: this.url,
      schema: this.schema,
      hasPublishableKey: !!this.publishableKey,
      hasSecretKey: !!this.secretKey,
      hasDatabaseUrl: !!this.databaseUrl
    });
  }

  /**
   * Get configuration summary for logging (without exposing secrets)
   */
  getSummary(): Record<string, any> {
    return {
      url: this.url,
      schema: this.schema,
      hasPublishableKey: !!this.publishableKey,
      hasSecretKey: !!this.secretKey,
      hasDirectDatabaseUrl: !!this.databaseUrl
    };
  }

  /**
   * Extract project ID from URL
   * Example: https://ertsvhwtaeityanbmyzw.supabase.co -> ertsvhwtaeityanbmyzw
   */
  getProjectId(): string {
    const match = this.url.match(/https:\/\/([^.]+)\.supabase\.co/);
    return match ? match[1] : '';
  }
}

/**
 * ConfigurationError
 * Thrown when configuration validation fails
 */
export class ConfigurationError extends Error {
  constructor(message: string, variable: string) {
    super(message);
    this.name = 'ConfigurationError';
    this.variable = variable;
  }

  variable: string;
}
