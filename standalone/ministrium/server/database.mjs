import pg from 'pg';

// The caller must pass the dedicated URL only after runtimeMode succeeds.
export function createDatabase(connectionString) {
  const pool = new pg.Pool({connectionString, max: 5, connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000});
  return {
    query: /** @type {(sql: string, values?: any[]) => Promise<import('pg').QueryResult>} */ ((sql, values = []) => pool.query(sql, values)),
    async transaction(work) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await work({query:client.query.bind(client),exec:sql=>client.query(sql)});
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    },
    close: () => pool.end(),
  };
}
