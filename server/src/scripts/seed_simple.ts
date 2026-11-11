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

    // List existing tables
    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
    console.log('Tables:', tables.rows.map(r => r.table_name).join(', '));

    // Load JSON data
    const problems = JSON.parse(fs.readFileSync('/home/devsharma08/Downloads/Problem.json', 'utf8'));
    const testCases = JSON.parse(fs.readFileSync('/home/devsharma08/Downloads/TestCase.json', 'utf8'));
    const codeSnippets = JSON.parse(fs.readFileSync('/home/devsharma08/Downloads/CodeSnippet.json', 'utf8'));

    console.log(`Loaded: ${problems.length} problems, ${testCases.length} test cases, ${codeSnippets.length} code snippets`);

    // Insert problems
    for (const p of problems) {
      await client.query(
        `INSERT INTO "Problem" (id, name, problem_number, github_oid, problem_definition, problem_hints, difficulty_level, creator_id, is_custom, time_limit_ms, data_structure, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          p.id,
          p.name,
          p.problem_number,
          p.github_oid || null,
          p.problem_definition,
          p.problem_hints || [],
          p.difficulty_level,
          null,
          p.isCustom || false,
          p.timeLimitMs || 600000,
          p.data_structure || null,
          new Date(),
          new Date()
        ]
      );
    }
    console.log(`Inserted ${problems.length} problems`);

    // Insert test cases
    for (const tc of testCases) {
      await client.query(
        `INSERT INTO "TestCase" (id, input, expected_output, is_public, problem_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [tc.id, tc.input, tc.expectedOutput, tc.is_public || true, tc.problemId, new Date()]
      );
    }
    console.log(`Inserted ${testCases.length} test cases`);

    // Insert code snippets
    for (const cs of codeSnippets) {
      await client.query(
        `INSERT INTO "CodeSnippet" (id, language, code, wrapper_code, problem_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [cs.id, cs.language, cs.code, cs.wrapperCode || null, cs.problemId, new Date()]
      );
    }
    console.log(`Inserted ${codeSnippets.length} code snippets`);

    // Verify
    const pCount = await client.query('SELECT count(*) FROM "Problem"');
    const tcCount = await client.query('SELECT count(*) FROM "TestCase"');
    const csCount = await client.query('SELECT count(*) FROM "CodeSnippet"');
    console.log(`\nVerification:`);
    console.log(`  Problems: ${pCount.rows[0].count}`);
    console.log(`  TestCases: ${tcCount.rows[0].count}`);
    console.log(`  CodeSnippets: ${csCount.rows[0].count}`);

    // Check Two Sum
    const twoSum = await client.query("SELECT id, name FROM \"Problem\" WHERE name = 'Two Sum'");
    console.log(`\nTwo Sum problems: ${twoSum.rows.length}`);
    for (const row of twoSum.rows) {
      const tc = await client.query('SELECT * FROM "TestCase" WHERE problem_id = $1 AND is_public = true', [row.id]);
      console.log(`  ${row.id}: ${row.name} - ${tc.rows.length} public test cases`);
      if (tc.rows.length > 0) {
        console.log(`    First case: input="${tc.rows[0].input}", expected="${tc.rows[0].expectedOutput}"`);
      }
    }

  } catch (e: any) {
    console.error('ERROR:', e.code, e.message);
  } finally {
    await client.end();
  }
}

main();
