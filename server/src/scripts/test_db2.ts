import { Client } from 'pg';

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

    // Count problems
    const r1 = await client.query('SELECT count(*) FROM "Problem"');
    console.log('Total problems:', r1.rows[0].count);

    // Check Two Sum
    const twoSum = await client.query("SELECT id, name FROM \"Problem\" WHERE name = 'Two Sum'");
    console.log('Two Sum problems:', twoSum.rows.length);
    for (const row of twoSum.rows) {
      console.log('  ', row.id, row.name);
      const tc = await client.query('SELECT * FROM "TestCase" WHERE "problemId" = $1 AND "is_public" = true', [row.id]);
      console.log('  Public test cases:', tc.rows.length);
      for (const t of tc.rows.slice(0, 5)) {
        console.log('    input="', tc.input, '", expected="', tc.expectedOutput, '"');
      }
    }

    // Check all problems count
    const allProblems = await client.query('SELECT count(*) FROM "Problem"');
    console.log('Total problems:', allProblems.rows[0].count);

  } catch (e: any) {
    console.error('DB ERR:', e.code, e.message);
  } finally {
    await client.end();
  }
}

main();