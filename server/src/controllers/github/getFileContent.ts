import type { Request, Response } from "express";
import { CACHE_KEYS, GITHUB_OWNER, GITHUB_REPO } from "../../config/github.js";
import { getCacheKey } from "../../utils/cacheKey.js";
import { getQueryValue } from "../../utils/request.js";
import { internalCache } from "../../Lib/cache.js";
import { postGraphQL } from "../../Lib/githubClient.js";
import { prisma } from "../../Lib/prisma.js";
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
    const [data, testcases] = await Promise.all([
      postGraphQL<GitHubFileContentResponse>({
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
          oid,
        },
      }),
      prisma.problem.findUnique({
        where: {
          github_oid: oid,
        },
        select: {
          test_cases: true,
          id: true,
          problem_definition: true,
          problem_hints: true,
          difficulty_level: true,
        },
      }),
    ]);

    const content = {
      content: data.data?.repository?.object?.text,
      test_cases: testcases?.test_cases || [],
      problem_definition: testcases?.problem_definition,
      problem_hints: testcases?.problem_hints,
      difficulty_level: testcases?.difficulty_level,
      id: testcases?.id,
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
    console.error("GraphQL Fetch Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
