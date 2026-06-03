import postgres from 'postgres';

/**
 * DatabaseAdapter - Wraps postgres client to provide a consistent query interface
 *
 * Adapts the postgres npm package to the query interface expected by SagaRepository:
 * - query(sql: string, params: any[]): Promise<QueryResult>
 *
 * The postgres client uses tagged template literals, but we provide a traditional
 * parameterized query interface for compatibility with existing repository code.
 */
export interface QueryResult {
  rows: any[];
  rowCount: number;
}

export class DatabaseAdapter {
  constructor(private sql: ReturnType<typeof postgres>) {}

  /**
   * Execute a parameterized SQL query
   *
   * @param query SQL query with $1, $2, ... placeholders
   * @param params Array of parameter values
   * @returns QueryResult with rows array and rowCount
   *
   * @example
   * const result = await db.query('SELECT * FROM saga_state WHERE id = $1', [sagaId]);
   * result.rows.forEach(row => console.log(row));
   */
  async query(query: string, params: any[] = []): Promise<QueryResult> {
    try {
      // Use the postgres client's unsafe method to execute parameterized queries
      // The unsafe method accepts traditional SQL with $1, $2, ... placeholders
      const rows = await this.sql.unsafe(query, params);

      return {
        rows: rows || [],
        rowCount: rows ? rows.length : 0
      };
    } catch (error) {
      // Re-throw to preserve error information for SagaRepository handlers
      throw error;
    }
  }

  /**
   * Close the database connection
   * Call during application shutdown
   */
  async end(): Promise<void> {
    await this.sql.end();
  }
}
