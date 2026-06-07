import type { Request, Response } from "express";
import { CACHE_KEYS, GITHUB_OWNER, GITHUB_REPO } from "../../config/github.js";
import { githubRestHeaders } from "../../Lib/githubClient.js";
import { internalCache } from "../../Lib/cache.js";
import type { GitHubContentItem } from "../../types/github.js";

export const getFiles = async (_req: Request, res: Response) => {
  try {
    const cached = internalCache.get(CACHE_KEYS.files);
    if (cached) {
      res.set("Cache-Control", "public,max-age=600");
      return res.status(200).json(cached);
    }

    const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents`, {
      method: "GET",
      headers: githubRestHeaders(),
    });

    if (!response.ok) {
      console.error(`GitHub Error: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ error: `GitHub request failed with status ${response.status}` });
    }

    const payload = (await response.json()) as unknown;
    const data = Array.isArray(payload) ? (payload as GitHubContentItem[]).slice(0, 50) : [];
    const cleanData = data.map((item) => ({
      name: item.name,
      downloadUrl: item.download_url,
      type: item.type,
      path: item.path,
    }));

    internalCache.set(CACHE_KEYS.files, cleanData, 10 * 60);
    res.set("Cache-Control", "public,max-age=600");
    return res.status(200).json(cleanData);
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
