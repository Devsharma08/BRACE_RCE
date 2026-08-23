import type { Request, Response } from "express";
import { CACHE_KEYS, GITHUB_OWNER, GITHUB_REPO } from "../../config/github.js";
import { internalCache } from "../../lib/cache.js";
import { postGraphQL } from "../../lib/githubClient.js";
import type { GitHubRepoStatsResponse } from "../../types/github.js";

export const getRepoStats = async (_req: Request, res: Response) => {
  try {
    const cached = internalCache.get(CACHE_KEYS.repoStats);
    if (cached) {
      res.set("Cache-Control", "public,max-age=600");
      return res.status(200).json(cached);
    }

    const data = await postGraphQL<GitHubRepoStatsResponse>({
      query: `query($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          stargazerCount
          forkCount
          languages(first: 5, orderBy: {field: SIZE, direction: DESC}) {
            edges {
              size
              node {
                name
                color
              }
            }
          }
        }
      }`,
      variables: { owner: GITHUB_OWNER, name: GITHUB_REPO },
    });

    const stats = data.data?.repository;

    if (!stats) return res.status(404).json({ error: "Stats not found" });

    internalCache.set(CACHE_KEYS.repoStats, stats, 10 * 60);
    res.set("Cache-Control", "public,max-age=600");
    return res.send(stats);
  } catch {
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
