import type { Request, Response } from "express";
import { CACHE_KEYS, EXTENSION_LANGUAGE_MAP } from "../../config/github.js";
import { internalCache } from "../../Lib/cache.js";
import { postGraphQL } from "../../Lib/githubClient.js";
import type { GitHubFileNamesResponse } from "../../types/github.js";

type LanguageMeta = {
  size: number;
  color: string | null;
};

export const getFileNames = async (_req: Request, res: Response) => {
  try {
    const cached = internalCache.get(CACHE_KEYS.fileNames);
    if (cached) {
      res.set("Cache-Control", "public,max-age=600");
      return res.status(200).json(cached);
    }

    const rawData = await postGraphQL<GitHubFileNamesResponse>({
      query: `
        query {
          repository(owner: "Devsharma08", name: "DSA-LEETCODE") {
            object(expression: "main:") {
              ... on Tree {
                entries {
                  name
                  type
                  oid
                }
              }
            }
            languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
              edges {
                size
                node {
                  name
                  color
                }
              }
            }
          }
        }
      `,
    });

    const entries = rawData.data?.repository?.object?.entries;
    const languagesData = rawData.data?.repository?.languages?.edges;

    if (!entries) {
      return res.status(404).json({ error: "Repository structure data not found" });
    }

    const languageMap = new Map<string, LanguageMeta>();
    for (const edge of languagesData ?? []) {
      languageMap.set(edge.node.name.toLowerCase(), {
        size: edge.size,
        color: edge.node.color ?? null,
      });
    }

    const unifiedResponse = entries.map((item) => {
      let matchedLanguage: string | null;

      if (item.type === "tree") {
        matchedLanguage = EXTENSION_LANGUAGE_MAP[item.name.toLowerCase()] || item.name;
      } else {
        const parts = item.name.split(".");
        const extension = parts.length > 1 ? parts.pop()?.toLowerCase() ?? "" : "";
        matchedLanguage = EXTENSION_LANGUAGE_MAP[extension] || null;
      }

      const langMeta = matchedLanguage ? languageMap.get(matchedLanguage.toLowerCase()) : null;

      return {
        name: item.name,
        type: item.type,
        oid: item.oid,
        language: matchedLanguage || "Unknown",
        size: langMeta?.size ?? 0,
        color: langMeta?.color || "#cccccc",
      };
    });

    internalCache.set(CACHE_KEYS.fileNames, unifiedResponse, 10 * 60);
    res.set("Cache-Control", "public,max-age=600");
    return res.status(200).json(unifiedResponse);
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
