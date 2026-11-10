import { Client } from 'pg';

async function main() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'brace_user',
    password: 'brace_password',
    database: 'brace_rce'
  });
  
  try {
    await client.connect();
    console.log('Connected to Postgres');
    
    // Create problems table
    await client.query(`
      CREATE TABLE IF NOT EXISTS problems (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        difficulty VARCHAR(50),
        category VARCHAR(100),
        tags TEXT[],
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Created problems table');
    
    // Create test_cases table
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_cases (
        id SERIAL PRIMARY KEY,
        problem_id INTEGER REFERENCES problems(id) ON DELETE CASCADE,
        input TEXT NOT NULL,
        expected_output TEXT NOT NULL,
        is_hidden BOOLEAN DEFAULT FALSE,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Created test_cases table');
    
    // Create snippets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS snippets (
        id SERIAL PRIMARY KEY,
        problem_id INTEGER REFERENCES problems(id) ON DELETE CASCADE,
        language VARCHAR(50) NOT NULL,
        code TEXT NOT NULL,
        is_starter BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Created snippets table');
    
    // Insert test problems
    await client.query(`
      INSERT INTO problems (title, description, difficulty, category, tags)
      VALUES 
        ('Two Sum', 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.', 'easy', 'Array', ARRAY['array', 'hash-table']),
        ('Add Two Numbers', 'You are given two non-empty linked lists representing two non-negative integers.', 'medium', 'Linked List', ARRAY['linked-list', 'math']),
        ('Longest Substring Without Repeating Characters', 'Given a string s, find the length of the longest substring without repeating characters.', 'medium', 'String', ARRAY['string', 'sliding-window'])
      ON CONFLICT DO NOTHING
    `);
    console.log('Inserted test problems');
    
    const problems = await client.query('SELECT id, title FROM problems');
    console.log('All problems:', problems.rows);
  } catch (e: any) {
    console.error('DB ERR:', e.code, e.message);
  } finally {
    await client.end();
  }
}

main();
