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
 * • Every number in the original 124-problem catalog (1–34 and 100–189)
 *   and every number in the current seed JSON is assigned to at least one
 *   learning path. Numbers may appear in multiple paths when a problem has
 *   multiple valid data-structure/technique classifications.
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
    lcNumbers: [1, 3, 4, 5, 6, 8, 10, 11, 14, 15, 16, 17, 18, 22, 24, 26, 27, 28, 31, 34, 35, 36, 38, 39, 40, 41, 42, 45, 46, 48, 50, 53, 54, 55, 56, 57, 58, 66, 67, 68, 70, 73, 75, 76, 78, 88, 90, 91, 94, 95, 96, 106, 114, 116, 118, 120, 123, 125, 131, 135, 136, 139, 140, 142, 143, 144, 147, 152, 154, 157, 159, 167, 169, 170, 173, 179, 180, 182, 185, 187, 189, 198, 202, 213, 217, 219, 238, 242, 268, 274, 275, 283, 287, 289, 300, 322, 347, 412, 435, 647, 678, 792, 836, 860, 876, 883, 907, 1014, 1250, 1371, 1603, 2026, 2139, 2743, 2759, 2804, 2807, 2858, 3859],
  },
  {
    name: "Stack",
    order: 2,
    category: "Linear Data Structures",
    description: "LIFO (Last In First Out) data structure. Learn push, pop, peek operations.",
    prerequisites: ["Arrays"],
    nextStructures: ["Queue"],
    lcNumbers: [3, 20, 22, 25, 32, 42, 150, 155, 163, 164, 232, 239, 678, 739, 883, 1036, 1127, 1371, 1767, 2749],
  },
  {
    name: "Queue",
    order: 3,
    category: "Linear Data Structures",
    description: "FIFO (First In First Out) data structure. Learn enqueue, dequeue operations.",
    prerequisites: ["Arrays"],
    nextStructures: ["Linked List", "Graph"],
    lcNumbers: [13, 14, 23, 101, 104, 112, 117, 119, 127, 150, 153, 160, 200, 207, 329, 417, 547, 649, 768, 803, 860, 1706, 1767, 2749],
  },
  {
    name: "Linked List",
    order: 4,
    category: "Linear Data Structures",
    description: "Dynamic data structure with nodes connected by pointers.",
    prerequisites: ["Arrays"],
    nextStructures: ["Hash Table"],
    lcNumbers: [2, 19, 21, 23, 25, 31, 33, 34, 61, 82, 83, 86, 92, 105, 107, 114, 138, 141, 143, 148, 160, 175, 176, 179, 181, 206, 908, 1765],
  },
  {
    name: "Hash Table",
    order: 5,
    category: "Data Structures",
    description: "Key-value storage with O(1) average time complexity.",
    prerequisites: ["Linked List"],
    nextStructures: ["Tree", "Trie"],
    lcNumbers: [1, 3, 28, 49, 76, 106, 109, 115, 118, 122, 128, 130, 136, 169, 188, 202, 208, 211, 217, 219, 242, 274, 275, 287, 347, 355, 2743, 2762, 2804, 2858],
  },
  {
    name: "Tree",
    order: 6,
    category: "Non-Linear Data Structures",
    description: "Hierarchical data structure with nodes and edges.",
    prerequisites: ["Stack", "Queue"],
    nextStructures: ["Binary Search Tree", "Heap"],
    lcNumbers: [11, 12, 13, 14, 16, 17, 19, 20, 21, 94, 95, 96, 100, 101, 102, 103, 104, 105, 108, 110, 111, 114, 125, 134, 143, 145, 183, 199, 226, 230, 235, 297, 329, 543, 572, 1544],
  },
  {
    name: "Binary Search Tree",
    order: 7,
    category: "Non-Linear Data Structures",
    description: "Sorted tree structure with O(log n) operations.",
    prerequisites: ["Tree"],
    nextStructures: ["Heap"],
    lcNumbers: [95, 96, 98, 100, 102, 183, 230, 235],
  },
  {
    name: "Heap",
    order: 8,
    category: "Non-Linear Data Structures",
    description: "Complete binary tree with heap property.",
    prerequisites: ["Tree"],
    nextStructures: ["Graph"],
    lcNumbers: [15, 23, 100, 101, 102, 104, 109, 124, 130, 149, 160, 171, 215, 295, 347, 621, 789, 794],
  },
  {
    name: "Graph",
    order: 9,
    category: "Non-Linear Data Structures",
    description: "Network of nodes and edges. Master DFS, BFS, Dijkstra.",
    prerequisites: ["Queue", "Heap"],
    nextStructures: [],
    lcNumbers: [27, 29, 30, 79, 108, 113, 127, 128, 129, 132, 137, 144, 156, 165, 167, 171, 172, 174, 184, 186, 189, 200, 207, 212, 329, 332, 355, 417, 547, 684, 695, 744, 753, 768, 803, 1036, 1706],
  },
  {
    name: "Trie",
    order: 10,
    category: "Advanced Data Structures",
    description: "Prefix tree for efficient string operations.",
    prerequisites: ["Hash Table", "Tree"],
    nextStructures: [],
    lcNumbers: [14, 79, 174, 208, 211, 212],
  },
  {
    name: "Segment Tree",
    order: 11,
    category: "Advanced Data Structures",
    description: "Tree for range queries and updates.",
    prerequisites: ["Tree", "Heap"],
    nextStructures: ["Fenwick Tree"],
    lcNumbers: [103, 104, 124, 130, 139, 239, 647, 907],
  },
  {
    name: "Fenwick Tree",
    order: 12,
    category: "Advanced Data Structures",
    description: "Efficient data structure for prefix sums (binary indexed tree).",
    prerequisites: ["Segment Tree"],
    nextStructures: [],
    lcNumbers: [42, 103, 104, 114, 120, 138, 139, 160, 238, 1603],
  },
  {
    name: "Searching",
    order: 13,
    category: "Techniques",
    description: "Binary search, lower bounds, and ordering-based lookups over sorted collections.",
    prerequisites: ["Arrays"],
    nextStructures: ["Tree"],
    lcNumbers: [4, 5, 33, 34, 35, 74, 129, 131, 133, 153, 161, 166, 178, 275, 792, 907, 1014],
  },
  {
    name: "Dynamic Programming",
    order: 14,
    category: "Techniques",
    description: "Break problems into overlapping subproblems with memoization or tabulation.",
    prerequisites: ["Arrays", "Tree"],
    nextStructures: ["Greedy"],
    lcNumbers: [6, 10, 22, 24, 53, 62, 64, 70, 91, 118, 121, 131, 151, 152, 162, 198, 213, 300, 322, 647, 1250, 836, 2743, 2807],
  },
  {
    name: "Math",
    order: 15,
    category: "Techniques",
    description: "Number theory, digit manipulation, and arithmetic building blocks.",
    prerequisites: ["Arrays"],
    nextStructures: [],
    lcNumbers: [7, 8, 9, 10, 13, 18, 29, 32, 43, 50, 69, 126, 136, 140, 142, 159, 182, 412, 1014, 2139, 3859],
  },
  {
    name: "Greedy",
    order: 16,
    category: "Techniques",
    description: "Optimal local choices and interval sweeps for scheduling problems.",
    prerequisites: ["Dynamic Programming", "Heap"],
    nextStructures: [],
    lcNumbers: [11, 15, 23, 24, 45, 55, 56, 57, 121, 134, 146, 149, 153, 158, 168, 177, 274, 275, 435, 621, 649, 836, 883],
  },
];
