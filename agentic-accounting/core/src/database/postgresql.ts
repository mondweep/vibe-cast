import { Pool, PoolClient, PoolConfig, QueryResult, QueryResultRow } from 'pg';

/**
 * Database configuration options
 */
export interface DatabaseConfig extends PoolConfig {
  /** Connection string (takes precedence over individual options) */
  connectionString?: string;

  /** Maximum number of connections in the pool */
  max?: number;

  /** Minimum number of connections in the pool */
  min?: number;

  /** Idle timeout in milliseconds */
  idleTimeoutMillis?: number;

  /** Connection timeout in milliseconds */
  connectionTimeoutMillis?: number;
}

/**
 * Default database configuration
 */
const DEFAULT_CONFIG: DatabaseConfig = {
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

/**
 * PostgreSQL database client with connection pooling
 */
export class DatabaseClient {
  private pool: Pool | null = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the connection pool
   */
  async connect(): Promise<void> {
    if (this.pool) {
      throw new Error('Database already connected');
    }

    this.pool = new Pool(this.config);

    // Test the connection
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
    } catch (error) {
      await this.disconnect();
      throw new Error(
        `Failed to connect to database: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  /**
   * Close all connections in the pool
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  /**
   * Execute a query with parameters
   */
  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    try {
      return await this.pool.query<T>(text, params);
    } catch (error) {
      throw new Error(
        `Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get a client from the pool for transactions
   */
  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    return await this.pool.connect();
  }

  /**
   * Execute a function within a transaction
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats(): {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  } {
    if (!this.pool) {
      return { totalCount: 0, idleCount: 0, waitingCount: 0 };
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  /**
   * Check if database is connected
   */
  isConnected(): boolean {
    return this.pool !== null;
  }
}

/**
 * Create and initialize a database client
 */
export async function createDatabaseClient(
  config: DatabaseConfig
): Promise<DatabaseClient> {
  const client = new DatabaseClient(config);
  await client.connect();
  return client;
}
