/**
 * Frontend view-model connecting the /ds pages to the learning & recommendation
 * module (server: prisma/learningPathsData.ts + GET /api/learning-paths).
 *
 * The /ds UI only has pages for a subset of learning items, so each item maps
 * to its closest DS page (e.g. Heap / BST / Trie → /ds/tree). Slugs here are
 * real URLs — every value resolves through DS_DETAILS_MAP (exact key or one of
 * its `slugs` aliases).
 */

export const DS_TOPIC_LABELS: Record<string, string> = {
  array: "Arrays & Strings",
  stack: "Stacks & Queues",
  queue: "Queues",
  "linked-list": "Linked Lists",
  tree: "Trees & Graphs",
  graph: "Graphs",
  searching: "Sorting & Searching",
  sorting: "Sorting",
  "dynamic-programming": "Dynamic Programming",
  math: "Math & Geometry",
  greedy: "Greedy & Intervals",
};

/** URL aliases → canonical page key used for progress aggregation. */
export const DS_SLUG_ALIASES: Record<string, string> = {
  sorting: "searching",
  dp: "dynamic-programming",
  string: "array",
  interval: "greedy",
};

/** Learning-item name → DS page slug (mirrors LEARNING_PATH_BLUEPRINT).
 *  Every value MUST be a real /ds/:slug page key (see DS_DETAILS_MAP) so
 *  progress aggregates onto an existing page — e.g. Queue folds into the
 *  Stacks & Queues page, Heap / BST / Trie fold into Trees & Graphs. */
export const LEARNING_ITEM_SLUG: Record<string, string> = {
  Arrays: "array",
  Stack: "stack",
  Queue: "stack",
  "Linked List": "linked-list",
  "Hash Table": "array",
  Tree: "tree",
  "Binary Search Tree": "tree",
  Heap: "tree",
  Graph: "tree",
  Trie: "tree",
  "Segment Tree": "tree",
  "Fenwick Tree": "tree",
  Searching: "searching",
  "Dynamic Programming": "dynamic-programming",
  Math: "math",
  Greedy: "greedy",
};

export const canonicalDsSlug = (slug: string) => DS_SLUG_ALIASES[slug] ?? slug;

export const dsTopicLabel = (slug: string) => DS_TOPIC_LABELS[slug] ?? slug;

/** Completion visual state for a DS page / card. */
export type DsCompletionState = "COMPLETED" | "PARTIAL" | "NONE";

export const dsCompletionState = (progress?: {
  total: number;
  completed: number;
  inProgress: number;
}): DsCompletionState => {
  if (!progress || progress.total === 0) return "NONE";
  if (progress.completed >= progress.total) return "COMPLETED";
  if (progress.completed > 0 || progress.inProgress > 0) return "PARTIAL";
  return "NONE";
};
