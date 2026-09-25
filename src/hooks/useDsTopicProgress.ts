import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { LEARNING_ITEM_SLUG } from "../data/dsTopics";

/**
 * Real-time completion + recommendation view of the learning-path graph for
 * the /ds pages. One shared ["learning-paths"] query (same key the
 * LearningPaths page invalidates after progress writes) with a short staleTime
 * and focus refetch so the cards track the DB without a manual reload.
 *
 * /ds and /ds/:slug are public routes but GET /learning-paths is authenticated,
 * so the query is gated on the auth session: signed-out visitors keep the static
 * corpus data instead of firing a 401 (and the auth-invalidation interceptor).
 */

export type DsTopicProgress = {
  total: number;
  completed: number;
  inProgress: number;
  problemIds: string[];
  previous: string[]; // DS page slugs (prerequisite structures)
  next: string[]; // DS page slugs (recommended next structures)
};

type ApiLearningItem = {
  id: string;
  name: string;
  progress: { progressStatus: string } | null;
  problemIds: string[];
  prerequisitesDetails?: { id: string; name: string }[];
  nextStructuresDetails?: { id: string; name: string }[];
};

const emptyPage = (): DsTopicProgress => ({
  total: 0,
  completed: 0,
  inProgress: 0,
  problemIds: [],
  previous: [],
  next: [],
});

export function useDsTopicProgress() {
  const { isAuthenticated } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["learning-paths"],
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await api.get("/learning-paths");
      return (res.data.items ?? []) as ApiLearningItem[];
    },
  });

  const bySlug = useMemo(() => {
    const map: Record<string, DsTopicProgress> = {};
    const page = (slug: string) => (map[slug] ??= emptyPage());

    for (const item of data ?? []) {
      const slug = LEARNING_ITEM_SLUG[item.name];
      if (!slug) continue;

      const current = page(slug);
      current.total += 1;
      if (item.progress?.progressStatus === "COMPLETED") current.completed += 1;
      else if (item.progress?.progressStatus === "IN_PROGRESS") current.inProgress += 1;

      for (const problemId of item.problemIds ?? []) {
        if (!current.problemIds.includes(problemId)) current.problemIds.push(problemId);
      }

      const linkTargets = (deps: { name: string }[] | undefined, bucket: string[]) => {
        for (const dep of deps ?? []) {
          const target = LEARNING_ITEM_SLUG[dep.name];
          if (!target || target === slug) continue;
          if (!bucket.includes(target)) bucket.push(target);
        }
      };
      linkTargets(item.prerequisitesDetails, current.previous);
      linkTargets(item.nextStructuresDetails, current.next);
    }

    return map;
  }, [data]);

  return {
    bySlug,
    items: (data ?? []) as ApiLearningItem[],
    isLoading: isLoading && isAuthenticated,
  };
}
