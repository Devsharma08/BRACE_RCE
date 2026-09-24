/**
 * Canonical learning-path blueprint for the learning & recommendation module.
 *
 * Single source of truth shared by:
 *   - prisma/seed-learning-paths.ts        → idempotent standalone population
 *   - prisma/seed.ts (seedLearningPaths)   → full wipe-and-reseed path
 *
 * Conventions
 * -----------
 * • prerequisites / nextStructures hold learning-item NAMES here and are
 *   resolved to LearningItem ids at seed time — the DB stores ids
 *   (schema.prisma: "IDs of prerequisite learning items").
 * • lcNumbers reference Problem rows through the seeded name convention
 *   ("LeetCode-01E" → LC 1, "LeetCode210M" → LC 210). Unknown numbers are
 *   skipped with a warning so this file stays valid as the pool grows.
 * • Trie / Segment Tree / Fenwick Tree have thin coverage in the seeded pool;
 *   their lists point at the closest existing problems.
 */

export interface LearningPathBlueprintItem {
  name: string;
  order: number;
  category: string;
  description: string;
  prerequisites: string[];
  nextStructures: string[];
  lcNumbers: number[];
}

export const LEARNING_PATH_BLUEPRINT: LearningPathBlueprintItem[] = [
  {
    name: "Arrays",
    order: 1,
    category: "Fundamentals",
    description:
      "Master array operations, indexing, and basic manipulations. The foundation of all data structures.",
    prerequisites: [],
    nextStructures: ["Stack", "Queue", "Linked List"],
    lcNumbers: [1, 121, 26, 27, 66, 88, 118, 11, 238, 15],
  },
  {
    name: "Stack",
    order: 2,
    category: "Linear Data Structures",
    description: "LIFO (Last In First Out) data structure. Learn push, pop, peek operations.",
    prerequisites: ["Arrays"],
    nextStructures: ["Queue"],
    lcNumbers: [32, 232, 716, 739],
  },
  {
    name: "Queue",
    order: 3,
    category: "Linear Data Structures",
    description: "FIFO (First In First Out) data structure. Learn enqueue, dequeue operations.",
    prerequisites: ["Arrays"],
    nextStructures: ["Linked List", "Graph"],
    lcNumbers: [622, 232, 239, 649, 752],
  },
  {
    name: "Linked List",
    order: 4,
    category: "Linear Data Structures",
    description: "Dynamic data structure with nodes connected by pointers.",
    prerequisites: ["Arrays"],
    nextStructures: ["Hash Table"],
    lcNumbers: [2, 141, 143, 83, 876, 92, 61, 82, 138, 23, 25],
  },
  {
    name: "Hash Table",
    order: 5,
    category: "Data Structures",
    description: "Key-value storage with O(1) average time complexity.",
    prerequisites: ["Linked List"],
    nextStructures: ["Tree", "Trie"],
    lcNumbers: [242, 49, 1, 3, 128, 347, 76, 953, 2622],
  },
  {
    name: "Tree",
    order: 6,
    category: "Non-Linear Data Structures",
    description: "Hierarchical data structure with nodes and edges.",
    prerequisites: ["Stack", "Queue"],
    nextStructures: ["Binary Search Tree", "Heap"],
    lcNumbers: [100, 101, 104, 110, 111, 102, 103, 105, 114, 543, 572, 297, 366],
  },
  {
    name: "Binary Search Tree",
    order: 7,
    category: "Non-Linear Data Structures",
    description: "Sorted tree structure with O(log n) operations.",
    prerequisites: ["Tree"],
    nextStructures: ["Heap"],
    lcNumbers: [98, 230, 235],
  },
  {
    name: "Heap",
    order: 8,
    category: "Non-Linear Data Structures",
    description: "Complete binary tree with heap property.",
    prerequisites: ["Tree"],
    nextStructures: ["Graph"],
    lcNumbers: [703, 1046, 347, 295, 23, 973],
  },
  {
    name: "Graph",
    order: 9,
    category: "Non-Linear Data Structures",
    description: "Network of nodes and edges. Master DFS, BFS, Dijkstra.",
    prerequisites: ["Queue", "Heap"],
    nextStructures: [],
    lcNumbers: [133, 547, 695, 210, 994, 743, 787, 127, 417, 130, 684, 332, 778, 79, 269],
  },
  {
    name: "Trie",
    order: 10,
    category: "Advanced Data Structures",
    description: "Prefix tree for efficient string operations.",
    prerequisites: ["Hash Table", "Tree"],
    nextStructures: [],
    lcNumbers: [79, 953],
  },
  {
    name: "Segment Tree",
    order: 11,
    category: "Advanced Data Structures",
    description: "Tree for range queries and updates.",
    prerequisites: ["Tree", "Heap"],
    nextStructures: ["Fenwick Tree"],
    lcNumbers: [239],
  },
  {
    name: "Fenwick Tree",
    order: 12,
    category: "Advanced Data Structures",
    description: "Efficient data structure for prefix sums (binary indexed tree).",
    prerequisites: ["Segment Tree"],
    nextStructures: [],
    lcNumbers: [238, 42],
  },
];
