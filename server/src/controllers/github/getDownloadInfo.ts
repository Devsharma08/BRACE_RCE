import type { Request, Response } from "express";
import { CACHE_KEYS } from "../../config/github.js";
import { getCacheKey } from "../../utils/cacheKey.js";
import { getQueryValue } from "../../utils/request.js";
import { internalCache } from "../../Lib/cache.js";
import { postGraphQL } from "../../Lib/githubClient.js";
import type { GitHubDownloadInfoResponse } from "../../types/github.js";

export const getDownloadInfo = async (req: Request, res: Response) => {
  const filePath = getQueryValue(req.query.path);

  if (!filePath) {
    return res.status(400).json({ error: "Missing required path query parameter" });
  }

  const cacheKey = getCacheKey(CACHE_KEYS.downloadInfo, filePath);
  const cached = internalCache.get(cacheKey);
  if (cached) {
    res.set("Cache-Control", "public,max-age=600");
    return res.status(200).json(cached);
  }

  try {
    const data = await postGraphQL<GitHubDownloadInfoResponse>({
      query: `
        query($expr: String!) {
          repository(owner: "Devsharma08", name: "DSA-LEETCODE") {
            object(expression: $expr) {
              ... on Blob {
                downloadUrl
                byteSize
                name
              }
            }
          }
        }
      `,
      variables: {
        expr: `main:${filePath}`,
      },
    });

    const content = data.data?.repository?.object;
    if (!content) {
      return res.status(404).json({ error: "File not found or empty" });
    }

    const size = (content.byteSize ?? 0) / 1024;
    const result = {
      size: size > 1024 ? `${(size / 1024).toFixed(2)}MB` : `${size.toFixed(2)}KB`,
      name: content.name,
      url: content.downloadUrl,
    };

    internalCache.set(cacheKey, result, 10 * 60);
    res.set("Cache-Control", "public,max-age=600");
    return res.send(result);
  } catch (error) {
    console.error("Download Info Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
