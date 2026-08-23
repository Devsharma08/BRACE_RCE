import type { Request, Response } from "express";
import { CACHE_KEYS, GITHUB_OWNER, GITHUB_REPO } from "../../config/github.js";
import { getCacheKey } from "../../utils/cacheKey.js";
import { getQueryValue } from "../../utils/request.js";
import { internalCache } from "../../lib/cache.js";
import { postGraphQL } from "../../lib/githubClient.js";
import { prisma } from "../../lib/prisma.js";
import type { GitHubFileContentResponse } from "../../types/github.js";

export const getFileContent = async (req: Request, res: Response) => {
  const oid = getQueryValue(req.query.oid);

  if (!oid) {
    return res.status(400).json({ error: "Missing required oid query parameter" });
  }

  const cacheKey = getCacheKey(CACHE_KEYS.fileContent, oid);
  const cached = internalCache.get(cacheKey);
  if (cached) {
    res.set("Cache-Control", "public,max-age=600");
    res.setHeader("Content-Type", "application/json");
    return res.json(cached);
  }

  try {
    // 1. Fetch problem data from Prisma DB by id or github_oid
    const problemRecord = await prisma.problem.findFirst({
      where: {
        OR: [
          { id: oid },
          { github_oid: oid },
        ],
      },
      select: {
        id: true,
        name: true,
        github_oid: true,
        test_cases: true,
        code_snippets: true,
        problem_definition: true,
        problem_hints: true,
        difficulty_level: true,
      },
    });

    let githubText: string | undefined;

    // 2. If problem has a valid github_oid, attempt to fetch raw file text from GitHub GraphQL API
    const targetGitOid = problemRecord?.github_oid || (oid.length === 40 ? oid : null);
    if (targetGitOid) {
      try {
        const data = await postGraphQL<GitHubFileContentResponse>({
          query: `
            query($owner: String!, $name: String!, $oid: GitObjectID!) {
              repository(owner: $owner, name: $name) {
                object(oid:$oid) {
                  ... on Blob {
                    text
                  }
                }
              }
            }
          `,
          variables: {
            owner: GITHUB_OWNER,
            name: GITHUB_REPO,
            oid: targetGitOid,
          },
        });
        githubText = data.data?.repository?.object?.text;
      } catch (err) {
        console.warn(`GitHub GraphQL fetch warning for OID ${targetGitOid}:`, err);
      }
    }

    // 3. Fallback content if GitHub text is unavailable
    const defaultSnippet = problemRecord?.code_snippets?.[0]?.code ||
      `// Solution for ${problemRecord?.name || "problem"}\nfunction solution() {\n  \n}\n`;

    const contentText = githubText || defaultSnippet;

    const content = {
      content: contentText,
      test_cases: problemRecord?.test_cases || [],
      code_snippets: problemRecord?.code_snippets || [],
      problem_definition: problemRecord?.problem_definition || "",
      problem_hints: problemRecord?.problem_hints || [],
      difficulty_level: problemRecord?.difficulty_level || "MEDIUM",
      id: problemRecord?.id || oid,
      name: problemRecord?.name || "",
    };

    if (!content.content) {
      return res.status(404).json({ error: "File not found or empty" });
    }

    if (content.content.length > 50000) {
      return res.status(413).json({ error: "File content is too large" });
    }

    internalCache.set(cacheKey, content, 10 * 60);
    res.set("Cache-Control", "public,max-age=600");
    res.setHeader("Content-Type", "application/json");
    return res.json(content);
  } catch (error) {
    console.error("Fetch File Content Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
