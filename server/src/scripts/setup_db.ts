import { Client } from 'pg';
import * as fs from 'fs';

async function main() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'brace_user',
    password: 'BraceDb2024Secure',
    database: 'brace_rce'
  });

  try {
    await client.connect();
    console.log('Connected to Postgres');

    // Read and execute the SQL schema
    const sql = fs.readFileSync('/home/ec2-user/BRACE_RCE/server/src/scripts/create_tables.sql', 'utf8');
    const statements = sql.split(';').filter(s => s.trim().length > 0);

    for (const stmt of statements) {
      try {
        await client.query(stmt);
      } catch (e: any) {
        // Skip errors like "already exists"
        if (!e.message.includes('already exists')) {
          console.error('SQL Error:', e.message);
          console.error('Statement:', stmt.substring(0, 100));
        }
      }
    }

    // Verify tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('\nTables in database:');
    tables.rows.forEach(r => console.log('  -', r.table_name));

    // Count problems
    const count = await client.query('SELECT count(*) FROM "Problem"');
    console.log(`\nProblem count: ${count.rows[0].count}`);

  } catch (e: any) {
    console.error('DB ERR:', e.code, e.message);
  } finally {
    await client.end();
  }
}

main();
