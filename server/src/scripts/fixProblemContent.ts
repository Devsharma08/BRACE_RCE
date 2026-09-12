import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { prisma } from "../lib/prisma.js";

/**
 * Fixes problems that were seeded from server/prisma/leetcodeProblems.ts with
 * file-name style names ("LeetCode-101E") and one-line plain-text definitions.
 *
 * Proper content is taken from problems_seed.json (the canonical source used by
 * seed.ts), matched by the real LeetCode number parsed from the name, with a
 * name-based fallback. Problems that exist in neither source (mostly premium
 * LeetCode questions) keep their existing description but get a proper title
 * and an HTML-formatted definition.
 *
 * Only `name`, `problem_definition` and `problem_hints` are touched.
 * `problem_number`, `github_oid`, test cases and code snippets are preserved
 * (the execution/signature suite depends on those).
 *
 * Usage:
 *   npx tsx src/scripts/fixProblemContent.ts --dry   # report only
 *   npx tsx src/scripts/fixProblemContent.ts         # apply updates
 */

interface SeedProblem {
    name: string;
    problem_number: number;
    problem_definition: string;
    problem_hints?: string[];
    difficulty_level?: string;
}

const NAME_RE = /^LeetCode[-\s]?(\d+)([EMH])?$/i;

// Proper titles for problems absent from problems_seed.json (fallback safety net;
// the primary title comes from parsing "<Title> - <body>" out of the definition).
const FALLBACK_TITLES: Record<number, string> = {
    210: "Course Schedule II",
    261: "Graph Valid Tree",
    269: "Alien Dictionary",
    271: "Encode and Decode Strings",
    277: "Find the Celebrity",
    424: "Longest Repeating Character Replacement",
    567: "Permutation in String",
    759: "Employee Free Time",
};

function stripHtml(s: string): string {
    return s
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .trim();
}

function htmlEscape(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

async function main() {
    const dry = process.argv.includes("--dry");

    const seedPath = path.join(process.cwd(), "../problems_seed.json");
    if (!fs.existsSync(seedPath)) {
        console.error("problems_seed.json not found at", seedPath);
        process.exit(1);
    }
    const seedProblems: SeedProblem[] = JSON.parse(
        fs.readFileSync(seedPath, "utf8")
    ).problems;
    const byNumber = new Map<number, SeedProblem>(
        seedProblems.map((p) => [p.problem_number, p])
    );
    const byName = new Map<string, SeedProblem>(
        seedProblems.map((p) => [p.name.toLowerCase(), p])
    );
    console.log(`Loaded ${seedProblems.length} seed problems.\n`);

    const bad = await prisma.problem.findMany({
        where: { isCustom: false, name: { startsWith: "LeetCode" } },
        select: {
            id: true,
            name: true,
            problem_number: true,
            github_oid: true,
            problem_definition: true,
            problem_hints: true,
        },
    });
    console.log(`Found ${bad.length} problems with file-name style names.\n`);

    let updated = 0;
    let fallback = 0;
    const failures: string[] = [];

    for (const row of bad) {
        const match = row.name.match(NAME_RE);
        if (!match) {
            failures.push(`#${row.problem_number} "${row.name}": unparseable name`);
            continue;
        }
        const lcNumber = parseInt(match[1], 10);

        // 1) Preferred: match the seed entry by the real LeetCode number.
        let src: SeedProblem | undefined = byNumber.get(lcNumber);
        let via = `seed#problem_number=${lcNumber}`;

        if (!src) {
            // 2) Fallback: derive the title from the definition ("Title - body")
            //    and look the seed up by name.
            const plain = stripHtml(row.problem_definition);
            const dashIdx = plain.indexOf(" - ");
            const title =
                dashIdx > 0 ? plain.slice(0, dashIdx).trim() : (FALLBACK_TITLES[lcNumber] ?? "");
            const body = dashIdx > 0 ? plain.slice(dashIdx + 3).trim() : plain;

            const byNameHit = title ? byName.get(title.toLowerCase()) : undefined;
            if (byNameHit) {
                src = byNameHit;
                via = `seed#name="${byNameHit.name}"`;
            } else {
                // 3) Final fallback: keep the existing description, fix the name
                //    and format the definition as HTML. No content is invented.
                if (!title) {
                    failures.push(
                        `#${row.problem_number} "${row.name}": no seed match and no derivable title`
                    );
                    continue;
                }
                const html =
                    `<p><strong>${htmlEscape(title)}</strong></p>\n\n<p>${htmlEscape(body)}</p>`;
                console.log(
                    `[FALLBACK] #${row.problem_number} "${row.name}" -> "${title}" (no seed entry; definition formatted from existing text)`
                );
                fallback++;
                if (!dry) {
                    await prisma.problem.update({
                        where: { id: row.id },
                        data: {
                            name: title,
                            problem_definition: html,
                        },
                    });
                }
                updated++;
                continue;
            }
        }

        const hints = Array.isArray(src.problem_hints) && src.problem_hints.length > 0
            ? src.problem_hints
            : row.problem_hints;

        console.log(
            `[UPDATE] #${row.problem_number} oid=${row.github_oid} "${row.name}" -> "${src.name}" (via ${via})`
        );

        if (!dry) {
            await prisma.problem.update({
                where: { id: row.id },
                data: {
                    name: src.name,
                    problem_definition: src.problem_definition,
                    problem_hints: hints,
                },
            });
        }
        updated++;
    }

    console.log(
        `\n${dry ? "[DRY RUN] " : ""}Done. updated=${updated} (fallback-formatted=${fallback}), failures=${failures.length}`
    );
    for (const f of failures) console.log(`  FAILED: ${f}`);

    await prisma.$disconnect();
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
