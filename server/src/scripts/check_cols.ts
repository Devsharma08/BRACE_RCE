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
    const r = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'CodeSnippet' ORDER BY ordinal_position");
    console.log('CodeSnippet columns:', r.rows.map(r => r.column_name).join(', '));
    await client.end();
  } catch (e: any) {
    console.error('Error:', e.message);
  }
}

main();