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

    // Drop existing tables
    await client.query('DROP TABLE IF EXISTS "CodeSnippet" CASCADE');
    await client.query('DROP TABLE IF EXISTS "TestCase" CASCADE');
    await client.query('DROP TABLE IF EXISTS "Problem" CASCADE');
    await client.query('DROP TABLE IF EXISTS "User" CASCADE');

    // Create tables
    await client.query(`
      CREATE TABLE "User" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "username" VARCHAR(255) UNIQUE NOT NULL,
        "email" VARCHAR(255) UNIQUE,
        "emailVerified" BOOLEAN DEFAULT TRUE,
        "password" TEXT,
        "role" VARCHAR(50) DEFAULT 'USER',
        "avatarUrl" TEXT,
        "bio" TEXT DEFAULT 'try beat me',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE "Problem" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(255) NOT NULL,
        "problem_number" INTEGER UNIQUE,
        "github_oid" VARCHAR(255) UNIQUE,
        "problem_definition" TEXT,
        "problem_hints" TEXT[],
        "difficulty_level" VARCHAR(50),
        "creatorId" UUID,
        "isCustom" BOOLEAN DEFAULT FALSE,
        "timeLimitMs" INTEGER DEFAULT 600000,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        "data_structure" VARCHAR(255),
        CONSTRAINT fk_problem_creator FOREIGN KEY ("creatorId") REFERENCES "User"(id) ON DELETE SET NULL
      )
    `);
    await client.query(`
      CREATE TABLE "TestCase" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "input" TEXT NOT NULL,
        "expectedOutput" TEXT NOT NULL,
        "is_public" BOOLEAN DEFAULT TRUE,
        "problemId" UUID NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_test_case_problem FOREIGN KEY ("problemId") REFERENCES "Problem"(id) ON DELETE CASCADE
      )
    `);
    await client.query(`
      CREATE TABLE "CodeSnippet" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "language" VARCHAR(50) NOT NULL,
        "code" TEXT NOT NULL,
        "wrapperCode" TEXT,
        "problemId" UUID NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_code_snippet_problem FOREIGN KEY ("problemId") REFERENCES "Problem"(id) ON DELETE CASCADE
      )
    `);
    console.log('Tables created');

    // Load JSON data
    const problems = JSON.parse(fs.readFileSync('/home/ec2-user/Problem.json', 'utf8'));
    const testCases = JSON.parse(fs.readFileSync('/home/ec2-user/TestCase.json', 'utf8'));
    const codeSnippets = JSON.parse(fs.readFileSync('/home/ec2-user/CodeSnippet.json', 'utf8'));

    console.log('Loaded: ' + problems.length + ' problems, ' + testCases.length + ' test cases, ' + codeSnippets.length + ' code snippets');

    // Insert problems
    for (const p of problems) {
await client.query(
        `INSERT INTO "Problem" ("id", "name", "problem_number", "github_oid", "problem_definition", "problem_hints", "difficulty_level", "creatorId", "isCustom", "timeLimitMs", "data_structure", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [p.id, p.name, p.problem_number, p.github_oid || null, p.problem_definition, p.problem_hints || [], p.difficulty_level, null, p.isCustom || false, p.timeLimitMs || 600000, p.data_structure || null, new Date(), new Date()]
      );
    }
    console.log('Inserted ' + problems.length + ' problems');

    // Insert test cases
    for (const tc of testCases) {
await client.query(
        `INSERT INTO "TestCase" ("id", "input", "expectedOutput", "is_public", "problemId", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [tc.id, tc.input, tc.expectedOutput, tc.is_public || true, tc.problemId, new Date()]
      );
    }
    console.log('Inserted ' + testCases.length + ' test cases');

    // Insert code snippets
    for (const cs of codeSnippets) {
await client.query(
        `INSERT INTO "CodeSnippet" ("id", "language", "code", "wrapperCode", "problemId", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [cs.id, cs.language, cs.code, cs.wrapperCode || null, cs.problemId, new Date()]
      );
    }
    console.log('Inserted ' + codeSnippets.length + ' code snippets');

    // Verify
    const pCount = await client.query('SELECT count(*) FROM "Problem"');
    const tcCount = await client.query('SELECT count(*) FROM "TestCase"');
    const csCount = await client.query('SELECT count(*) FROM "CodeSnippet"');
    console.log('\nVerification:');
    console.log('  Problems: ' + pCount.rows[0].count);
    console.log('  TestCases: ' + tcCount.rows[0].count);
    console.log('  CodeSnippets: ' + csCount.rows[0].count);

    // Check Two Sum
    const twoSum = await client.query("SELECT id, name FROM \"Problem\" WHERE name = 'Two Sum'");
    console.log('\nTwo Sum problems: ' + twoSum.rows.length);
    for (const row of twoSum.rows) {
      const tc = await client.query('SELECT * FROM "TestCase" WHERE "problemId" = $1 AND "is_public" = true', [row.id]);
      console.log('  ' + row.id + ': ' + row.name + ' - ' + tc.rows.length + ' public test cases');
      if (tc.rows.length > 0) {
        console.log('    First case: input="' + tc.rows[0].input + '", expected="' + tc.rows[0].expectedOutput + '"');
      }
    }

  } catch (e: any) {
    console.error('ERROR:', e.code, e.message);
  } finally {
    await client.end();
  }
}

main();