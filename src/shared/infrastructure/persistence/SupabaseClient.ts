import postgres from 'postgres';

/**
 * SupabaseClient - PostgreSQL client for Supabase backend
 *
 * Provides a singleton connection to Supabase PostgreSQL database
 * using the postgres npm package for optimal Node.js performance.
 *
 * Supports connection pooling via PgBouncer (Supabase default)
 */
export class SupabaseClient {
  private static instance: ReturnType<typeof postgres> | null = null;

  /**
   * Get or create the Supabase database connection
   *
   * Connection string format:
   * postgres://user:password@host:5432/database?sslmode=require
   *
   * Environment variables (Supabase dashboard → Project Settings → Database):
   * - SUPABASE_DB_HOST: Database host
   * - SUPABASE_DB_PORT: Database port (default: 5432)
   * - SUPABASE_DB_USER: Database user
   * - SUPABASE_DB_PASSWORD: Database password
   * - SUPABASE_DB_NAME: Database name
   *
   * @returns PostgreSQL connection instance
   * @throws Error if required environment variables are missing
   */
  static getInstance(): ReturnType<typeof postgres> {
    if (this.instance) {
      return this.instance;
    }

    const {
      SUPABASE_DB_HOST,
      SUPABASE_DB_PORT = '5432',
      SUPABASE_DB_USER,
      SUPABASE_DB_PASSWORD,
      SUPABASE_DB_NAME,
      SUPABASE_DB_SSL = 'require'
    } = process.env;

    if (!SUPABASE_DB_HOST || !SUPABASE_DB_USER || !SUPABASE_DB_PASSWORD || !SUPABASE_DB_NAME) {
      throw new Error(
        'Missing Supabase database configuration. ' +
        'Ensure SUPABASE_DB_HOST, SUPABASE_DB_USER, SUPABASE_DB_PASSWORD, and SUPABASE_DB_NAME are set.'
      );
    }

    // Connection string with pooling settings
    const connectionString = `postgres://${SUPABASE_DB_USER}:${SUPABASE_DB_PASSWORD}@${SUPABASE_DB_HOST}:${SUPABASE_DB_PORT}/${SUPABASE_DB_NAME}?sslmode=${SUPABASE_DB_SSL}`;

    this.instance = postgres(connectionString, {
      // Connection pooling via PgBouncer (Supabase default)
      max: 10, // Max connections in pool
      idle_timeout: 30, // Close idle connections after 30s
      connect_timeout: 10, // Timeout on initial connection
      types: {
        bigint: postgres.BigInt, // Handle BigInt from BIGSERIAL
      }
    });

    return this.instance;
  }

  /**
   * Close the database connection
   * Call this during application shutdown
   */
  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.end();
      this.instance = null;
    }
  }
}
