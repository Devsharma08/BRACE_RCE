import 'dotenv/config';
import { prisma } from '../lib/prisma.js';

/**
 * Dumps ONE Problem row together with every relation declared in schema.prisma
 * (direct + reverse), so we can verify what is actually stored for a problem.
 *
 * Relations on Problem (schema.prisma):
 *   creator        -> User             (creatorId, "UserProblems")
 *   test_cases     <- TestCase[]       (Cascade)
 *   code_snippets  <- CodeSnippet[]    (Cascade)
 *   commonEvents   <- Event[]          (Event.commonProblemId)
 *   codeSubmissions<- CodeSubmission[] (Cascade)
 *   events         <-> Event[]         (m2m via _EventProblems)
 *   userProgress   <- UserProblemProgress[] (Cascade)
 *
 * Usage:
 *   npx tsx src/scripts/inspect_one_problem.ts                 # auto-pick richest
 *   npx tsx src/scripts/inspect_one_problem.ts <name|number|id> # specific
 *   npx tsx src/scripts/inspect_one_problem.ts --json          # raw JSON dump
 */

const arg = process.argv[2] ?? '';
const asJson = process.argv.includes('--json');

const clip = (s: string | null | undefined, n = 160) => {
  if (s == null) return null;
  const one = s.replace(/\s+/g, ' ').trim();
  return one.length > n ? `${one.slice(0, n)}…(len ${s.length})` : one;
};

async function pickTarget() {
  // Prefer a problem that exercises the most relations.
  const ranked = await prisma.problem.findMany({
    select: {
      id: true,
      name: true,
      problem_number: true,
      _count: {
        select: {
          test_cases: true,
          code_snippets: true,
          codeSubmissions: true,
          userProgress: true,
          events: true,
          commonEvents: true,
        },
      },
    },
  });

  const score = (p: (typeof ranked)[number]) => Object.values(p._count).reduce((a, b) => a + b, 0);
  ranked.sort((a, b) => score(b) - score(a));

  if (arg && !arg.startsWith('--')) {
    const found = ranked.find(
      (p) => p.id === arg || p.name === arg || String(p.problem_number) === arg,
    );
    if (found) return found;
    const like = ranked.find((p) => p.name.toLowerCase().includes(arg.toLowerCase()));
    if (like) return like;
    console.warn(`⚠  no problem matched "${arg}" — falling back to the richest one.`);
  }
  return ranked[0];
}

async function main() {
  const target = await pickTarget();
  console.log(`\n🔎 Target problem: ${target.name} (number=${target.problem_number ?? '—'}, id=${target.id})\n`);

  const problem = await prisma.problem.findUnique({
    where: { id: target.id },
    include: {
      creator: { select: { id: true, username: true, role: true } },
      test_cases: { orderBy: { is_public: 'desc' } },
      code_snippets: { orderBy: { language: 'asc' } },
      commonEvents: {
        select: { id: true, name: true, type: true, status: true, roomCode: true, hostId: true },
      },
      events: {
        select: { id: true, name: true, type: true, status: true, roomCode: true, isTemplate: true },
      },
      codeSubmissions: {
        orderBy: { createdAt: 'desc' },
        include: {
          userPersonalPerformance: {
            select: {
              id: true,
              status: true,
              score: true,
              user: { select: { id: true, username: true } },
              event: { select: { id: true, name: true, type: true } },
            },
          },
        },
      },
      userProgress: {
        orderBy: { updatedAt: 'desc' },
        include: { user: { select: { id: true, username: true } } },
      },
    },
  });

  if (!problem) throw new Error('Problem vanished between the count and the read.');

  // QuestionReport has NO Prisma relation to Problem (questionId is a bare String),
  // and LearningItem.problemIds is a String[] — so query those with raw SQL.
  const reports = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, "reportedBy", reason, status, "createdAt"
       FROM "QuestionReport" WHERE "questionId" = $1 ORDER BY "createdAt" DESC`,
    problem.id,
  );
  const reporters = reports.length
    ? await prisma.user.findMany({
        where: { id: { in: reports.map((r) => r.reportedBy) } },
        select: { id: true, username: true },
      })
    : [];
  const reporterName = new Map(reporters.map((u) => [u.id, u.username]));

  const learningItems = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, name, "order", category, prerequisites
       FROM "LearningItem" WHERE $1 = ANY("problemIds") ORDER BY "order" ASC`,
    problem.id,
  );

  if (asJson) {
    console.log(
      JSON.stringify(
        { ...problem, questionReports: reports, learningItems },
        (_k, v) => (typeof v === 'bigint' ? String(v) : v),
        2,
      ),
    );
    return;
  }

  const line = (s = '') => console.log(s);
  const RULE = '═'.repeat(78);
  const owned: string[] = [
    'test_cases',
    'code_snippets',
    'commonEvents',
    'events',
    'codeSubmissions',
    'userProgress',
    'creator',
  ];

  line(RULE);
  line('1. Problem (base row)');
  line(RULE);
  for (const [k, v] of Object.entries(problem)) {
    if (owned.includes(k)) continue;
    line(`  ${k.padEnd(18)} ${clip(String(v), 100)}`);
  }

  line('\n' + RULE);
  line('2. creator → User  (relation "UserProblems", FK Problem.creatorId)');
  line(RULE);
  line(
    problem.creator
      ? `  ${problem.creator.username}  (id=${problem.creator.id}, role=${problem.creator.role})`
      : '  null — seeded system problem',
  );

  line('\n' + RULE);
  line(`3. test_cases ← TestCase[]  (${problem.test_cases.length} rows)`);
  line(RULE);
  for (const [i, tc] of problem.test_cases.entries()) {
    line(`  [${i}] public=${tc.is_public}  id=${tc.id}`);
    line(`      input          : ${clip(tc.input, 200)}`);
    line(`      expectedOutput : ${clip(tc.expectedOutput, 200)}`);
  }

  line('\n' + RULE);
  line(`4. code_snippets ← CodeSnippet[]  (${problem.code_snippets.length} rows)`);
  line(RULE);
  for (const s of problem.code_snippets) {
    line(`  • ${s.language}  (id=${s.id}, wrapper=${s.wrapperCode ? 'yes' : 'no'})`);
    line(`      ${clip(s.code, 220)}`);
  }

  line('\n' + RULE);
  line(`5. commonEvents ← Event[]  (${problem.commonEvents.length} rows) — every user gets THIS problem`);
  line(RULE);
  for (const e of problem.commonEvents) {
    line(`  • ${e.name ?? '(unnamed)'}  type=${e.type} status=${e.status} room=${e.roomCode ?? '—'} id=${e.id}`);
  }

  line('\n' + RULE);
  line(`6. events <-> Event[]  (${problem.events.length} rows) — m2m join table _EventProblems (playlist)`);
  line(RULE);
  for (const e of problem.events) {
    line(`  • ${e.name ?? '(unnamed)'}  type=${e.type} status=${e.status} room=${e.roomCode ?? '—'} template=${e.isTemplate}`);
  }

  line('\n' + RULE);
  line(`7. codeSubmissions ← CodeSubmission[]  (${problem.codeSubmissions.length} rows)`);
  line(RULE);
  for (const s of problem.codeSubmissions) {
    const perf = s.userPersonalPerformance;
    line(
      `  • ${perf.user.username}  ${s.status}  ${s.passedCase}/${s.totalCases} cases  ${s.language}  ${s.runtimeMs ?? '—'}ms${s.isBestSubmission ? '  ★best' : ''}`,
    );
    line(
      `      attempt#${s.attemptNumber}  event=${perf.event.name ?? perf.event.id}(${perf.event.type})  perfStatus=${perf.status} score=${perf.score}`,
    );
    line(`      code: ${clip(s.submittedCode, 200)}`);
  }

  line('\n' + RULE);
  line(`8. userProgress ← UserProblemProgress[]  (${problem.userProgress.length} rows)`);
  line(RULE);
  for (const p of problem.userProgress) {
    line(
      `  • ${p.user.username}  solved=${p.isSolved} attempts=${p.attempts} lang=${p.lastLanguage ?? '—'} times=${JSON.stringify(p.submissionTimes)}`,
    );
    line(`      lastCode: ${clip(p.lastCode, 200)}`);
  }

  line('\n' + RULE);
  line(
    `9. QuestionReport[] — NOT a Prisma relation (questionId is a bare String)  (${reports.length} rows)`,
  );
  line(RULE);
  for (const r of reports) {
    line(`  • ${reporterName.get(r.reportedBy) ?? r.reportedBy}  status=${r.status}`);
    line(`      reason: ${clip(r.reason, 200)}`);
  }

  line('\n' + RULE);
  line(`10. LearningItem[] — via String[] "problemIds" (no FK)  (${learningItems.length} rows)`);
  line(RULE);
  for (const li of learningItems) {
    line(`  • [${li.order}] ${li.name}  (${li.category})  prereqs=${JSON.stringify(li.prerequisites)}`);
  }

  const total =
    problem.test_cases.length +
    problem.code_snippets.length +
    problem.commonEvents.length +
    problem.events.length +
    problem.codeSubmissions.length +
    problem.userProgress.length +
    reports.length +
    learningItems.length;

  line('\n' + RULE);
  line(
    `SUMMARY  ${problem.name} → ${total} related rows across 6 Prisma relations + 2 implicit (no-FK) links`,
  );
  line(RULE);
}

main()
  .catch((e) => {
    console.error('❌ failed:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

