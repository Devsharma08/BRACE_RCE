import type { Request, Response } from "express";
import { CACHE_KEYS, GITHUB_OWNER, GITHUB_REPO } from "../../config/github.js";
import { internalCache } from "../../lib/cache.js";
import { postGraphQL } from "../../lib/githubClient.js";
import type { GitHubCommitHistoryResponse } from "../../types/github.js";

export const commitHistory = async (_req: Request, res: Response) => {
  try {
    const cached = internalCache.get(CACHE_KEYS.commitHistory);
    if (cached) {
      res.set("Cache-Control", "public,max-age=600");
      return res.status(200).json(cached);
    }

    const data = await postGraphQL<GitHubCommitHistoryResponse>({
      query: `query($name: String!, $owner: String!) {
        repository(owner: $owner, name: $name) {
          defaultBranchRef {
            target {
              ... on Commit {
                history(first: 5) {
                  nodes {
                    message
                    committedDate
                    url
                  }
                }
              }
            }
          }
        }
      }`,
      variables: { owner: GITHUB_OWNER, name: GITHUB_REPO },
    });

    const history = data.data?.repository?.defaultBranchRef?.target?.history?.nodes;

    if (!history) return res.status(404).json({ error: "No history found" });

    internalCache.set(CACHE_KEYS.commitHistory, history, 10 * 60);
    res.set("Cache-Control", "public,max-age=600");
    return res.send(history);
  } catch {
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
