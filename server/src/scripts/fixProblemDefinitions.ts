import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { prisma } from "../lib/prisma.js";

/**
 * Repairs system problems whose `problem_definition` was spliced onto the row
 * by the OLD rich-description overlay in prisma/seed.ts, which joined
 * problems_seed.json to leetcodeProblems.ts by `problem_number`.
 *
 * The two sources use different numbering schemes (leetcodeProblems.ts uses a
 * local sequence 1..34 / 100..189, problems_seed.json uses real LeetCode
 * numbers — 108 of the 110 overlapping rows disagree), so ~87% of the overlaid
 * rows ended up with ANOTHER problem's description/examples/constraints while
 * their title, test cases and code snippets still described the original.
 *
 * Repair strategy (never destructive — only `name`/`problem_definition` are
 * touched, and only when they are actually wrong):
 *   1. Resolve each row back to its leetcodeProblems.ts entry via `github_oid`
 *      (all system rows carry one; it is the stable join key).
 *   2. Derive the row's canonical title from that entry's "<Title> - <body>"
 *      definition.
 *   3. If problems_seed.json has a rich HTML statement for the SAME title,
 *      use it; otherwise restore the row's own plain-text definition.
 *
 * Usage:
 *   npx tsx src/scripts/fixProblemDefinitions.ts --dry   # report only
 *   npx tsx src/scripts/fixProblemDefinitions.ts         # apply updates
 */

interface SourceEntry {
    title: string;
    definition: string;
}

interface SeedJsonProblem {
    name: string;
    problem_definition?: string;
}

/** Same join key as the overlay: case/space-insensitive canonical title. */
const normTitle = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");

const LEGACY_NAME_RE = /^LeetCode[-\s]?(\d+)([EMH])?$/i;

function unescapeTsString(raw: string): string {
    return raw.replace(/\\(.)/g, (_, ch: string) =>
        ch === "n" ? "\n" : ch === "t" ? "\t" : ch
    );
}

/**
 * Parse `problem("LeetCode-01E", 1, "<oid>", "<Title> - <body>", ...)` entries
 * out of server/prisma/leetcodeProblems.ts. The data file is machine-generated
 * with a fixed call signature, so a regex is sufficient (and avoids importing
 * across the tsconfig rootDir boundary from src/).
 */
function loadSourceEntries(): Map<string, SourceEntry> {
    const sourcePath = path.join(process.cwd(), "prisma", "leetcodeProblems.ts");
    const text = fs.readFileSync(sourcePath, "utf8");
    const entryRe =
        /problem\(\s*"((?:[^"\\]|\\.)*)",\s*\d+,\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"/g;

    const byOid = new Map<string, SourceEntry>();
    for (const match of text.matchAll(entryRe)) {
        const legacyName = unescapeTsString(match[1]);
        const oid = unescapeTsString(match[2]);
        const definition = unescapeTsString(match[3]);
        const title = definition.split(" - ", 1)[0]?.trim() || legacyName;
        byOid.set(oid, { title, definition });
    }
    return byOid;
}

function loadRichByTitle(): Map<string, SeedJsonProblem> {
    const seedPath = path.join(process.cwd(), "../problems_seed.json");
    const problems: SeedJsonProblem[] = JSON.parse(fs.readFileSync(seedPath, "utf8")).problems ?? [];
    const byTitle = new Map<string, SeedJsonProblem>();
    for (const problem of problems) {
        if (problem?.name) byTitle.set(normTitle(problem.name), problem);
    }
    return byTitle;
}

async function main() {
    const dry = process.argv.includes("--dry");

    const sourceByOid = loadSourceEntries();
    const richByTitle = loadRichByTitle();
    console.log(`Sources: ${sourceByOid.size} leetcodeProblems.ts entries, ${richByTitle.size} problems_seed.json titles.\n`);

    const rows = await prisma.problem.findMany({
        where: { isCustom: false },
        select: { id: true, name: true, problem_number: true, github_oid: true, problem_definition: true },
        orderBy: { problem_number: "asc" },
    });
    console.log(`Found ${rows.length} system problems.\n`);

    let jsonReplaced = 0;
    let restored = 0;
    let unchanged = 0;
    let renamed = 0;
    const unresolved: string[] = [];

    for (const row of rows) {
        const source = row.github_oid ? sourceByOid.get(row.github_oid) : undefined;
        if (!source) {
            unresolved.push(`#${row.problem_number} "${row.name}": no leetcodeProblems.ts entry for oid=${row.github_oid}`);
            continue;
        }

        const data: { name?: string; problem_definition?: string } = {};

        // Legacy file-style names never match the seed JSON by title — fix them.
        if (LEGACY_NAME_RE.test(row.name)) {
            data.name = source.title;
        }

        const rich = richByTitle.get(normTitle(source.title));
        const expected = rich?.problem_definition || source.definition;

        if (row.problem_definition !== expected) {
            data.problem_definition = expected;
            if (rich?.problem_definition) jsonReplaced++;
            else restored++;
            console.log(
                `[${rich ? "JSON" : "TS"}] #${row.problem_number} "${row.name}"` +
                `${data.name ? ` -> "${data.name}"` : ""} (${row.problem_definition.length} -> ${expected.length} chars)`
            );
        } else {
            unchanged++;
        }

        if (Object.keys(data).length === 0) continue;
        if (data.name) renamed++;
        if (!dry) {
            await prisma.problem.update({ where: { id: row.id }, data });
        }
    }

    console.log(
        `\n${dry ? "[DRY RUN] " : ""}Done. ` +
        `json-replaced=${jsonReplaced} ts-restored=${restored} unchanged=${unchanged} renamed=${renamed} ` +
        `unresolved=${unresolved.length}`
    );
    for (const u of unresolved) console.log(`  UNRESOLVED: ${u}`);

    await prisma.$disconnect();
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
