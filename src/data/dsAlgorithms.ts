// ─── Algorithm Library content for /ds/:slug ───────────────────────────────
// Curriculum adapted from the DSA Master Reference PDF
// (~/Downloads/DSA_Master_Reference.pdf): idea → per-language pseudocode →
// Big-O → Python/JavaScript/C++ implementations → classic question refs.

export type AlgorithmQuestion = {
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  note: string;
};

export type AlgorithmEntry = {
  id: string;
  name: string;
  idea: string;
  pseudocode: {
    python: string[];
    javascript: string[];
    cpp: string[];
  };
  timeComplexity: string;
  spaceComplexity: string;
  implementations: {
    python: string;
    javascript: string;
    cpp: string;
  };
  questions: AlgorithmQuestion[];
};

export type DSTopic = {
  slugs: string[];
  algorithms: AlgorithmEntry[];
};

export const DS_ALGORITHMS: Record<string, DSTopic> = {
  tree: {
    slugs: ["tree", "graph"],
    algorithms: [
      {
        id: "dfs-traversals",
        name: "Depth-First Traversals (pre / in / post)",
        idea: "Dive as deep as possible down one branch before backtracking. The same three-line skeleton produces preorder, inorder or postorder output depending on where the visit step sits relative to the recursive calls.",
        pseudocode: {
          python: [
            "def dfs(node):",
            "  if node is None: return",
            "  visit(node)          # preorder",
            "  dfs(node.left)",
            "  visit(node)          # inorder",
            "  dfs(node.right)",
          ],
          javascript: [
            "function dfs(node) {",
            "  if (node === null) return;",
            "  visit(node);        // preorder",
            "  dfs(node.left);",
            "  visit(node);        // inorder",
            "  dfs(node.right);",
            "}",
          ],
          cpp: [
            "void dfs(TreeNode* node) {",
            "  if (!node) return;",
            "  visit(node);          // preorder",
            "  dfs(node->left);",
            "  visit(node);          // inorder",
            "  dfs(node->right);",
            "}",
          ],
        },
        timeComplexity: "O(n)",
        spaceComplexity: "O(h) recursion stack (h = height)",
        implementations: {
          python:
`def inorder(root):
    if not root:
        return []
    return inorder(root.left) + [root.val] + inorder(root.right)`,
          javascript:
`function inorder(root) {
  if (!root) return [];
  return [...inorder(root.left), root.val, ...inorder(root.right)];
}`,
          cpp:
`void inorder(TreeNode* root, vector<int>& out) {
    if (!root) return;
    inorder(root->left, out);
    out.push_back(root->val);
    inorder(root->right, out);
}`,
        },
        questions: [
          { title: "Binary Tree Inorder Traversal", difficulty: "EASY", note: "Canonical inorder drill." },
          { title: "Maximum Depth of Binary Tree", difficulty: "EASY", note: "Pure recursion depth." },
          { title: "Binary Tree Right Side View", difficulty: "MEDIUM", note: "DFS with depth tracking." },
        ],
      },
      {
        id: "bfs-level-order",
        name: "Breadth-First Search (Level Order)",
        idea: "Explore the tree wave by wave using a queue. Capturing the queue length at the start of each round slices the traversal into clean levels — the base for anything 'per level'.",
        pseudocode: {
          python: [
            "queue = deque([root])",
            "while queue:",
            "  level_size = len(queue)",
            "  for _ in range(level_size):",
            "    node = queue.popleft()",
            "    queue.extend(children(node))",
          ],
          javascript: [
            "const queue = [root];",
            "while (queue.length > 0) {",
            "  const levelSize = queue.length;",
            "  for (let i = 0; i < levelSize; i++) {",
            "    const node = queue.shift();",
            "    queue.push(...children(node));",
            "  }",
            "}",
          ],
          cpp: [
            "queue<TreeNode*> q;",
            "q.push(root);",
            "while (!q.empty()) {",
            "  int sz = q.size();",
            "  for (int i = 0; i < sz; ++i) {",
            "    TreeNode* node = q.front(); q.pop();",
            "    push children of node into q;",
            "  }",
            "}",
          ],
        },
        timeComplexity: "O(n)",
        spaceComplexity: "O(w) queue (w = max width)",
        implementations: {
          python:
`from collections import deque

def level_order(root):
    if not root:
        return []
    out, q = [], deque([root])
    while q:
        level = []
        for _ in range(len(q)):
            node = q.popleft()
            level.append(node.val)
            if node.left:  q.append(node.left)
            if node.right: q.append(node.right)
        out.append(level)
    return out`,
          javascript:
`function levelOrder(root) {
  if (!root) return [];
  const out = [];
  let queue = [root];
  while (queue.length) {
    const level = [];
    const next = [];
    for (const node of queue) {
      level.push(node.val);
      if (node.left)  next.push(node.left);
      if (node.right) next.push(node.right);
    }
    out.push(level);
    queue = next;
  }
  return out;
}`,
          cpp:
`vector<vector<int>> levelOrder(TreeNode* root) {
    vector<vector<int>> out;
    queue<TreeNode*> q;
    if (root) q.push(root);
    while (!q.empty()) {
        int sz = q.size();
        vector<int> level;
        for (int i = 0; i < sz; ++i) {
            TreeNode* node = q.front(); q.pop();
            level.push_back(node->val);
            if (node->left)  q.push(node->left);
            if (node->right) q.push(node->right);
        }
        out.push_back(level);
    }
    return out;
}`,
        },
        questions: [
          { title: "Binary Tree Level Order Traversal", difficulty: "MEDIUM", note: "The pattern itself." },
          { title: "Average of Levels in Binary Tree", difficulty: "EASY", note: "Aggregate per level." },
          { title: "Binary Tree Zigzag Level Order Traversal", difficulty: "MEDIUM", note: "Reverse alternate levels." },
        ],
      },
      {
        id: "dijkstra",
        name: "Dijkstra's Shortest Path",
        idea: "Greedy single-source shortest path for non-negative weights: repeatedly settle the closest unsettled node and relax its outgoing edges through a min-priority queue.",
        pseudocode: {
          python: [
            "dist = {v: inf for v in graph}; dist[src] = 0",
            "heap = [(0, src)]",
            "while heap:",
            "  d, u = heappop(heap)",
            "  if d > dist[u]: continue",
            "  for v, w in graph[u]:",
            "    if d + w < dist[v]: dist[v] = d + w; heappush",
          ],
          javascript: [
            "dist[src] = 0;  // every other node: Infinity",
            "while (unvisited nodes remain) {",
            "  u = unvisited node with smallest dist[u];",
            "  if (dist[u] === Infinity) break;",
            "  for (const [v, w] of graph[u]) {",
            "    if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;",
            "  }",
            "}",
          ],
          cpp: [
            "vector<long long> dist(n, LLONG_MAX);",
            "dist[src] = 0;",
            "priority_queue<.., greater<>> pq; pq.push({0, src});",
            "while (!pq.empty()) {",
            "  auto [d, u] = pq.top(); pq.pop();",
            "  if (d > dist[u]) continue;   // stale entry",
            "  relax each (v, w) in adj[u];",
            "}",
          ],
        },
        timeComplexity: "O(E log V)",
        spaceComplexity: "O(V + E)",
        implementations: {
          python:
`import heapq

def dijkstra(graph, src):
    dist = {node: float("inf") for node in graph}
    dist[src] = 0
    heap = [(0, src)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue
        for v, w in graph[u]:
            nd = d + w
            if nd < dist[v]:
                dist[v] = nd
                heapq.heappush(heap, (nd, v))
    return dist`,
          javascript:
`function dijkstra(graph, src) {
  const dist = Object.fromEntries(
    Object.keys(graph).map((k) => [k, Infinity])
  );
  dist[src] = 0;
  const visited = new Set();
  while (visited.size < Object.keys(graph).length) {
    let u = null;
    for (const k of Object.keys(graph)) {
      if (!visited.has(k) && (u === null || dist[k] < dist[u])) u = k;
    }
    if (u === null || dist[u] === Infinity) break;
    visited.add(u);
    for (const [v, w] of graph[u]) {
      if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
    }
  }
  return dist;
}`,
          cpp:
`vector<long long> dijkstra(int n,
    vector<vector<pair<int,int>>>& adj, int src) {
    vector<long long> dist(n, LLONG_MAX);
    priority_queue<pair<long long,int>,
        vector<pair<long long,int>>, greater<>> pq;
    dist[src] = 0;
    pq.push({0, src});
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;
        for (auto [v, w] : adj[u]) {
            if (d + w < dist[v]) {
                dist[v] = d + w;
                pq.push({dist[v], v});
            }
        }
    }
    return dist;
}`,
        },
        questions: [
          { title: "Network Delay Time", difficulty: "MEDIUM", note: "Direct application." },
          { title: "Path With Minimum Effort", difficulty: "MEDIUM", note: "Relax on max-edge instead of sum." },
          { title: "Cheapest Flights Within K Stops", difficulty: "MEDIUM", note: "Bellman-Ford twist worth contrasting." },
        ],
      },
    ],
  },
  array: {
    slugs: ["array"],
    algorithms: [
      {
        id: "two-pointers",
        name: "Two Pointers (opposite ends)",
        idea: "On a sorted array, walk one pointer from each end inward. Sorted order lets you discard a whole side on every comparison, collapsing quadratic pair scans into a single linear sweep.",
        pseudocode: {
          python: [
            "left, right = 0, len(arr) - 1",
            "while left < right:",
            "  s = arr[left] + arr[right]",
            "  if s == target: return (left, right)",
            "  if s < target: left += 1",
            "  else: right -= 1",
          ],
          javascript: [
            "let left = 0, right = arr.length - 1;",
            "while (left < right) {",
            "  const s = arr[left] + arr[right];",
            "  if (s === target) return [left, right];",
            "  s < target ? left++ : right--;",
            "}",
          ],
          cpp: [
            "int left = 0, right = (int)arr.size() - 1;",
            "while (left < right) {",
            "  int s = arr[left] + arr[right];",
            "  if (s == target) return {left, right};",
            "  s < target ? ++left : --right;",
            "}",
          ],
        },
        timeComplexity: "O(n)",
        spaceComplexity: "O(1)",
        implementations: {
          python:
`def pair_sum(arr, target):
    left, right = 0, len(arr) - 1
    while left < right:
        s = arr[left] + arr[right]
        if s == target:
            return [left, right]
        if s < target:
            left += 1
        else:
            right -= 1
    return []`,
          javascript:
`function pairSum(arr, target) {
  let left = 0, right = arr.length - 1;
  while (left < right) {
    const s = arr[left] + arr[right];
    if (s === target) return [left, right];
    if (s < target) left += 1;
    else right -= 1;
  }
  return [];
}`,
          cpp:
`vector<int> pairSum(vector<int>& arr, int target) {
    int left = 0, right = (int)arr.size() - 1;
    while (left < right) {
        int s = arr[left] + arr[right];
        if (s == target) return {left, right};
        if (s < target) ++left;
        else --right;
    }
    return {};
}`,
        },
        questions: [
          { title: "Two Sum II — Input Array Is Sorted", difficulty: "MEDIUM", note: "Textbook template." },
          { title: "Container With Most Water", difficulty: "MEDIUM", note: "Always move the shorter wall." },
          { title: "3Sum", difficulty: "MEDIUM", note: "Fix one element + two pointers." },
        ],
      },
      {
        id: "sliding-window",
        name: "Sliding Window (variable size)",
        idea: "Turn 'longest/shortest valid span' scans into two monotone pointers: the right pointer grows the window every step, the left pointer shrinks it only when the window invariant breaks — every index is touched at most twice.",
        pseudocode: {
          python: [
            "start = best = 0",
            "for end in range(n):",
            "  add arr[end] to state",
            "  while state is invalid:",
            "    start += 1  # drop arr[start - 1]",
            "  best = max(best, end - start + 1)",
          ],
          javascript: [
            "let start = 0, best = 0;",
            "for (let end = 0; end < n; end++) {",
            "  add(arr[end]);",
            "  while (invalid()) drop(arr[start++]);",
            "  best = Math.max(best, end - start + 1);",
            "}",
          ],
          cpp: [
            "int start = 0, best = 0;",
            "for (int end = 0; end < n; ++end) {",
            "  add(arr[end]);",
            "  while (invalid()) drop(arr[start++]);",
            "  best = max(best, end - start + 1);",
            "}",
          ],
        },
        timeComplexity: "O(n)",
        spaceComplexity: "O(k) for window state",
        implementations: {
          python:
`def longest_unique_substring(s):
    last = {}
    start = best = 0
    for i, ch in enumerate(s):
        if ch in last and last[ch] >= start:
            start = last[ch] + 1
        last[ch] = i
        best = max(best, i - start + 1)
    return best`,
          javascript:
`function longestUniqueSubstring(s) {
  const last = new Map();
  let start = 0, best = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (last.has(ch) && last.get(ch) >= start) {
      start = last.get(ch) + 1;
    }
    last.set(ch, i);
    best = Math.max(best, i - start + 1);
  }
  return best;
}`,
          cpp:
`int longestUniqueSubstring(const string& s) {
    unordered_map<char, int> last;
    int start = 0, best = 0;
    for (int i = 0; i < (int)s.size(); ++i) {
        auto it = last.find(s[i]);
        if (it != last.end() && it->second >= start) {
            start = it->second + 1;
        }
        last[s[i]] = i;
        best = max(best, i - start + 1);
    }
    return best;
}`,
        },
        questions: [
          { title: "Longest Substring Without Repeating Characters", difficulty: "MEDIUM", note: "The template in the wild." },
          { title: "Minimum Size Subarray Sum", difficulty: "MEDIUM", note: "Shrink on sum >= target." },
          { title: "Fruit Into Baskets", difficulty: "MEDIUM", note: "Window over at-most-2 distinct." },
        ],
      },
      {
        id: "kadane",
        name: "Kadane's Algorithm (max subarray)",
        idea: "One pass, one decision: either extend the running subarray or restart at the current element — whichever is larger. The global answer is the best running sum ever seen.",
        pseudocode: {
          python: [
            "best = cur = arr[0]",
            "for x in arr[1:]:",
            "  cur = max(x, cur + x)",
            "  best = max(best, cur)",
            "return best",
          ],
          javascript: [
            "let best = nums[0], cur = nums[0];",
            "for (let i = 1; i < nums.length; i++) {",
            "  cur = Math.max(nums[i], cur + nums[i]);",
            "  best = Math.max(best, cur);",
            "}",
            "return best;",
          ],
          cpp: [
            "int best = nums[0], cur = nums[0];",
            "for (size_t i = 1; i < nums.size(); ++i) {",
            "  cur = max(nums[i], cur + nums[i]);",
            "  best = max(best, cur);",
            "}",
            "return best;",
          ],
        },
        timeComplexity: "O(n)",
        spaceComplexity: "O(1)",
        implementations: {
          python:
`def max_subarray(nums):
    best = cur = nums[0]
    for x in nums[1:]:
        cur = max(x, cur + x)
        best = max(best, cur)
    return best`,
          javascript:
`function maxSubarray(nums) {
  let best = nums[0], cur = nums[0];
  for (let i = 1; i < nums.length; i++) {
    cur = Math.max(nums[i], cur + nums[i]);
    best = Math.max(best, cur);
  }
  return best;
}`,
          cpp:
`int maxSubarray(vector<int>& nums) {
    int best = nums[0], cur = nums[0];
    for (size_t i = 1; i < nums.size(); ++i) {
        cur = max(nums[i], cur + nums[i]);
        best = max(best, cur);
    }
    return best;
}`,
        },
        questions: [
          { title: "Maximum Subarray", difficulty: "MEDIUM", note: "The original Kadane task." },
          { title: "Maximum Sum Circular Subarray", difficulty: "MEDIUM", note: "Total − min-subarray insight." },
          { title: "Maximum Product Subarray", difficulty: "MEDIUM", note: "Track max AND min (sign flips)." },
        ],
      },
    ],
  },
  "linked-list": {
    slugs: ["linked-list"],
    algorithms: [
      {
        id: "in-place-reversal",
        name: "In-Place List Reversal",
        idea: "Walk the list once, flipping each node's next pointer toward the previous node. No extra memory, no recursion — the classic O(n)/O(1) warm-up.",
        pseudocode: {
          python: [
            "prev = None",
            "while head:",
            "  head.next, prev, head = prev, head, head.next",
            "return prev",
          ],
          javascript: [
            "let prev = null;",
            "while (head) {",
            "  [head.next, prev, head] = [prev, head, head.next];",
            "}",
            "return prev;",
          ],
          cpp: [
            "ListNode* prev = nullptr;",
            "while (head) {",
            "  ListNode* nxt = head->next;",
            "  head->next = prev; prev = head; head = nxt;",
            "}",
            "return prev;",
          ],
        },
        timeComplexity: "O(n)",
        spaceComplexity: "O(1)",
        implementations: {
          python:
`def reverse_list(head):
    prev = None
    while head:
        nxt = head.next
        head.next = prev
        prev = head
        head = nxt
    return prev`,
          javascript:
`function reverseList(head) {
  let prev = null;
  while (head) {
    const nxt = head.next;
    head.next = prev;
    prev = head;
    head = nxt;
  }
  return prev;
}`,
          cpp:
`ListNode* reverseList(ListNode* head) {
    ListNode* prev = nullptr;
    while (head) {
        ListNode* nxt = head->next;
        head->next = prev;
        prev = head;
        head = nxt;
    }
    return prev;
}`,
        },
        questions: [
          { title: "Reverse Linked List", difficulty: "EASY", note: "The pattern itself." },
          { title: "Reverse Linked List II", difficulty: "MEDIUM", note: "Reverse a sub-range." },
          { title: "Swap Nodes in Pairs", difficulty: "MEDIUM", note: "Reverse in blocks of two." },
        ],
      },
      {
        id: "floyd-cycle",
        name: "Floyd's Cycle Detection (tortoise & hare)",
        idea: "Two pointers at different speeds either meet inside a cycle or the fast one falls off the end. Mathematically guaranteed to meet within one loop lap — O(1) space where a set would cost O(n).",
        pseudocode: {
          python: [
            "slow = fast = head",
            "while fast and fast.next:",
            "  slow, fast = slow.next, fast.next.next",
            "  if slow is fast: return True",
            "return False",
          ],
          javascript: [
            "let slow = head, fast = head;",
            "while (fast && fast.next) {",
            "  slow = slow.next;",
            "  fast = fast.next.next;",
            "  if (slow === fast) return true;",
            "}",
            "return false;",
          ],
          cpp: [
            "ListNode *slow = head, *fast = head;",
            "while (fast && fast->next) {",
            "  slow = slow->next;",
            "  fast = fast->next->next;",
            "  if (slow == fast) return true;",
            "}",
            "return false;",
          ],
        },
        timeComplexity: "O(n)",
        spaceComplexity: "O(1)",
        implementations: {
          python:
`def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False`,
          javascript:
`function hasCycle(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}`,
          cpp:
`bool hasCycle(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) return true;
    }
    return false;
}`,
        },
        questions: [
          { title: "Linked List Cycle", difficulty: "EASY", note: "Meet-in-loop detection." },
          { title: "Linked List Cycle II", difficulty: "MEDIUM", note: "Phase 2: restart one pointer at head." },
          { title: "Find the Duplicate Number", difficulty: "MEDIUM", note: "Floyd on an implicit list." },
        ],
      },
      {
        id: "merge-two-sorted",
        name: "Merge Two Sorted Lists",
        idea: "Thread nodes off both lists onto a dummy-headed tail, always taking the smaller head. The dummy node removes every empty-head special case.",
        pseudocode: {
          python: [
            "dummy = tail = ListNode()",
            "while l1 and l2:",
            "  tail.next = l1 if l1.val <= l2.val else l2",
            "  advance the taken list; tail = tail.next",
            "tail.next = l1 or l2",
            "return dummy.next",
          ],
          javascript: [
            "const dummy = { next: null }; let tail = dummy;",
            "while (l1 && l2) {",
            "  tail.next = l1.val <= l2.val ? l1 : l2;",
            "  advance the taken list; tail = tail.next;",
            "}",
            "tail.next = l1 ?? l2;",
            "return dummy.next;",
          ],
          cpp: [
            "ListNode dummy; ListNode* tail = &dummy;",
            "while (l1 && l2) {",
            "  tail->next = l1->val <= l2->val ? l1 : l2;",
            "  advance the taken list; tail = tail->next;",
            "}",
            "tail->next = l1 ? l1 : l2;",
            "return dummy.next;",
          ],
        },
        timeComplexity: "O(n + m)",
        spaceComplexity: "O(1)",
        implementations: {
          python:
`def merge_two_lists(l1, l2):
    dummy = tail = ListNode()
    while l1 and l2:
        if l1.val <= l2.val:
            tail.next, l1 = l1, l1.next
        else:
            tail.next, l2 = l2, l2.next
        tail = tail.next
    tail.next = l1 or l2
    return dummy.next`,
          javascript:
`function mergeTwoLists(l1, l2) {
  const dummy = { next: null };
  let tail = dummy;
  while (l1 && l2) {
    if (l1.val <= l2.val) {
      tail.next = l1; l1 = l1.next;
    } else {
      tail.next = l2; l2 = l2.next;
    }
    tail = tail.next;
  }
  tail.next = l1 ?? l2;
  return dummy.next;
}`,
          cpp:
`ListNode* mergeTwoLists(ListNode* l1, ListNode* l2) {
    ListNode dummy;
    ListNode* tail = &dummy;
    while (l1 && l2) {
        if (l1->val <= l2->val) {
            tail->next = l1; l1 = l1->next;
        } else {
            tail->next = l2; l2 = l2->next;
        }
        tail = tail->next;
    }
    tail->next = l1 ? l1 : l2;
    return dummy.next;
}`,
        },
        questions: [
          { title: "Merge Two Sorted Lists", difficulty: "EASY", note: "The pattern itself." },
          { title: "Sort List", difficulty: "MEDIUM", note: "Merge sort on a list." },
          { title: "Merge k Sorted Lists", difficulty: "HARD", note: "Scale it with a min-heap." },
        ],
      },
    ],
  },
  searching: {
    slugs: ["searching", "sorting"],
    algorithms: [
      {
        id: "binary-search",
        name: "Binary Search (boundary form)",
        idea: "Halve the search space each step on sorted data. The boundary variant (first/last occurrence) keeps going after a match, narrowing lo/hi until they bracket the answer.",
        pseudocode: {
          python: [
            "lo, hi = 0, len(nums) - 1",
            "while lo <= hi:",
            "  mid = (lo + hi) // 2",
            "  if nums[mid] == target: return mid",
            "  if nums[mid] < target: lo = mid + 1",
            "  else: hi = mid - 1",
          ],
          javascript: [
            "let lo = 0, hi = nums.length - 1;",
            "while (lo <= hi) {",
            "  const mid = (lo + hi) >> 1;",
            "  if (nums[mid] === target) return mid;",
            "  nums[mid] < target ? (lo = mid + 1) : (hi = mid - 1);",
            "}",
            "return -1;",
          ],
          cpp: [
            "int lo = 0, hi = (int)nums.size() - 1;",
            "while (lo <= hi) {",
            "  int mid = lo + (hi - lo) / 2;",
            "  if (nums[mid] == target) return mid;",
            "  if (nums[mid] < target) lo = mid + 1;",
            "  else hi = mid - 1;",
            "}",
            "return -1;",
          ],
        },
        timeComplexity: "O(log n)",
        spaceComplexity: "O(1)",
        implementations: {
          python:
`def search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1`,
          javascript:
`function search(nums, target) {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}`,
          cpp:
`int search(vector<int>& nums, int target) {
    int lo = 0, hi = (int)nums.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] == target) return mid;
        if (nums[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}`,
        },
        questions: [
          { title: "Binary Search", difficulty: "EASY", note: "The template itself." },
          { title: "Search Insert Position", difficulty: "EASY", note: "Return the boundary, not a match." },
          { title: "Find First and Last Position of Element", difficulty: "MEDIUM", note: "Two boundary searches." },
        ],
      },
      {
        id: "merge-sort",
        name: "Merge Sort",
        idea: "Divide the array in half, sort each half recursively, then merge two sorted halves with a two-pointer walk. Stable, predictable O(n log n) — the backbone of external sorting and linked-list sorting.",
        pseudocode: {
          python: [
            "def merge_sort(a):",
            "  if len(a) <= 1: return a",
            "  left = merge_sort(a[:mid])",
            "  right = merge_sort(a[mid:])",
            "  return merge(left, right)  # two-pointer walk",
          ],
          javascript: [
            "function mergeSort(a) {",
            "  if (a.length <= 1) return a;",
            "  const mid = a.length >> 1;",
            "  return merge(mergeSort(a.slice(0, mid)),",
            "               mergeSort(a.slice(mid)));",
            "}",
          ],
          cpp: [
            "void mergeSort(vector<int>& a, int lo, int hi) {",
            "  if (lo >= hi) return;",
            "  int mid = lo + (hi - lo) / 2;",
            "  mergeSort(a, lo, mid); mergeSort(a, mid + 1, hi);",
            "  merge halves into tmp; copy back into a;",
            "}",
          ],
        },
        timeComplexity: "O(n log n)",
        spaceComplexity: "O(n)",
        implementations: {
          python:
`def merge_sort(a):
    if len(a) <= 1:
        return a
    mid = len(a) // 2
    left = merge_sort(a[:mid])
    right = merge_sort(a[mid:])
    out, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            out.append(left[i]); i += 1
        else:
            out.append(right[j]); j += 1
    return out + left[i:] + right[j:]`,
          javascript:
`function mergeSort(a) {
  if (a.length <= 1) return a;
  const mid = a.length >> 1;
  const left = mergeSort(a.slice(0, mid));
  const right = mergeSort(a.slice(mid));
  const out = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    out.push(left[i] <= right[j] ? left[i++] : right[j++]);
  }
  return [...out, ...left.slice(i), ...right.slice(j)];
}`,
          cpp:
`void mergeSort(vector<int>& a, int lo, int hi) {
    if (lo >= hi) return;
    int mid = lo + (hi - lo) / 2;
    mergeSort(a, lo, mid);
    mergeSort(a, mid + 1, hi);
    vector<int> tmp;
    int i = lo, j = mid + 1;
    while (i <= mid && j <= hi)
        tmp.push_back(a[i] <= a[j] ? a[i++] : a[j++]);
    while (i <= mid) tmp.push_back(a[i++]);
    while (j <= hi)  tmp.push_back(a[j++]);
    copy(tmp.begin(), tmp.end(), a.begin() + lo);
}`,
        },
        questions: [
          { title: "Sort an Array", difficulty: "MEDIUM", note: "Implement it from scratch." },
          { title: "Merge k Sorted Lists", difficulty: "HARD", note: "Divide-and-conquer merging." },
          { title: "Count of Smaller Numbers After Self", difficulty: "HARD", note: "Merge sort + inversion counting." },
        ],
      },
      {
        id: "quick-sort",
        name: "Quick Sort (Lomuto partition)",
        idea: "Pick a pivot, partition the array so everything ≤ pivot sits left of it, then recurse on both sides. In-place and cache-friendly; randomizing the pivot defends against sorted-input worst cases.",
        pseudocode: {
          python: [
            "def quick_sort(a, lo, hi):",
            "  if lo >= hi: return",
            "  pivot, i = a[hi], lo",
            "  for j in range(lo, hi):",
            "    if a[j] <= pivot: a[i], a[j] = a[j], a[i]; i += 1",
            "  a[i], a[hi] = a[hi], a[i]  # pivot lands",
            "  recurse (lo, i-1) and (i+1, hi)",
          ],
          javascript: [
            "function quickSort(a, lo, hi) {",
            "  if (lo >= hi) return;",
            "  const pivot = a[hi]; let i = lo;",
            "  for (let j = lo; j < hi; j++) {",
            "    if (a[j] <= pivot) swap(a[i++], a[j]);",
            "  }",
            "  swap(a[i], a[hi]);  // pivot lands",
            "  quickSort(a, lo, i - 1); quickSort(a, i + 1, hi);",
            "}",
          ],
          cpp: [
            "void quickSort(vector<int>& a, int lo, int hi) {",
            "  if (lo >= hi) return;",
            "  int pivot = a[hi], i = lo;",
            "  for (int j = lo; j < hi; ++j)",
            "    if (a[j] <= pivot) swap(a[i++], a[j]);",
            "  swap(a[i], a[hi]);  // pivot lands",
            "  quickSort(a, lo, i - 1); quickSort(a, i + 1, hi);",
            "}",
          ],
        },
        timeComplexity: "O(n log n) avg · O(n²) worst",
        spaceComplexity: "O(log n) recursion",
        implementations: {
          python:
`def quick_sort(a, lo=0, hi=None):
    if hi is None:
        hi = len(a) - 1
    if lo >= hi:
        return a
    pivot, i = a[hi], lo
    for j in range(lo, hi):
        if a[j] <= pivot:
            a[i], a[j] = a[j], a[i]
            i += 1
    a[i], a[hi] = a[hi], a[i]
    quick_sort(a, lo, i - 1)
    quick_sort(a, i + 1, hi)
    return a`,
          javascript:
`function quickSort(a, lo = 0, hi = a.length - 1) {
  if (lo >= hi) return a;
  const pivot = a[hi];
  let i = lo;
  for (let j = lo; j < hi; j++) {
    if (a[j] <= pivot) {
      [a[i], a[j]] = [a[j], a[i]];
      i += 1;
    }
  }
  [a[i], a[hi]] = [a[hi], a[i]];
  quickSort(a, lo, i - 1);
  quickSort(a, i + 1, hi);
  return a;
}`,
          cpp:
`void quickSort(vector<int>& a, int lo, int hi) {
    if (lo >= hi) return;
    int pivot = a[hi], i = lo;
    for (int j = lo; j < hi; ++j) {
        if (a[j] <= pivot) swap(a[i++], a[j]);
    }
    swap(a[i], a[hi]);
    quickSort(a, lo, i - 1);
    quickSort(a, i + 1, hi);
}`,
        },
        questions: [
          { title: "Sort an Array", difficulty: "MEDIUM", note: "Compare against merge sort." },
          { title: "Kth Largest Element in an Array", difficulty: "MEDIUM", note: "Quickselect — partition, one side." },
          { title: "Sort Colors", difficulty: "MEDIUM", note: "Three-way (Dutch flag) partition." },
        ],
      },
    ],
  },
  stack: {
    slugs: ["stack"],
    algorithms: [
      {
        id: "monotonic-stack",
        name: "Monotonic Stack (next greater element)",
        idea: "Keep a stack of indices whose values are still waiting for their 'next greater'. A new larger value resolves everything smaller on top in one pop-storm — each element is pushed and popped at most once.",
        pseudocode: {
          python: [
            "stack = []  # indices, values decreasing",
            "for i, x in enumerate(nums):",
            "  while stack and nums[stack[-1]] < x:",
            "    out[stack.pop()] = x",
            "  stack.append(i)",
          ],
          javascript: [
            "const stack = [];  // indices, values decreasing",
            "for (let i = 0; i < nums.length; i++) {",
            "  while (stack.length && nums[stack.at(-1)] < nums[i]) {",
            "    out[stack.pop()] = nums[i];",
            "  }",
            "  stack.push(i);",
            "}",
          ],
          cpp: [
            "vector<int> stack;  // indices, values decreasing",
            "for (int i = 0; i < (int)nums.size(); ++i) {",
            "  while (!stack.empty() && nums[stack.back()] < nums[i]) {",
            "    out[stack.back()] = nums[i]; stack.pop_back();",
            "  }",
            "  stack.push_back(i);",
            "}",
          ],
        },
        timeComplexity: "O(n)",
        spaceComplexity: "O(n)",
        implementations: {
          python:
`def next_greater(nums):
    out = [-1] * len(nums)
    stack = []  # indices, values decreasing
    for i, x in enumerate(nums):
        while stack and nums[stack[-1]] < x:
            out[stack.pop()] = x
        stack.append(i)
    return out`,
          javascript:
`function nextGreater(nums) {
  const out = new Array(nums.length).fill(-1);
  const stack = [];
  for (let i = 0; i < nums.length; i++) {
    while (stack.length && nums[stack[stack.length - 1]] < nums[i]) {
      out[stack.pop()] = nums[i];
    }
    stack.push(i);
  }
  return out;
}`,
          cpp:
`vector<int> nextGreater(vector<int>& nums) {
    vector<int> out(nums.size(), -1);
    vector<int> stack;
    for (int i = 0; i < (int)nums.size(); ++i) {
        while (!stack.empty() && nums[stack.back()] < nums[i]) {
            out[stack.back()] = nums[i];
            stack.pop_back();
        }
        stack.push_back(i);
    }
    return out;
}`,
        },
        questions: [
          { title: "Next Greater Element I", difficulty: "EASY", note: "The pattern itself." },
          { title: "Daily Temperatures", difficulty: "MEDIUM", note: "Distance instead of value." },
          { title: "Largest Rectangle in Histogram", difficulty: "HARD", note: "Monotonic stack at its strongest." },
        ],
      },
      {
        id: "valid-parentheses",
        name: "Valid Parentheses (matching)",
        idea: "Push openers, and on every closer demand that the top of the stack is its exact partner. The string is valid iff the stack drains empty with no mismatch along the way.",
        pseudocode: {
          python: [
            "stack = []",
            "for ch in s:",
            "  if ch is a closer:",
            "    if not stack or stack.pop() != match(ch): return False",
            "  else: stack.append(ch)",
            "return not stack",
          ],
          javascript: [
            "const stack = [];",
            "for (const ch of s) {",
            "  if (isCloser(ch)) {",
            "    if (stack.pop() !== match(ch)) return false;",
            "  } else {",
            "    stack.push(ch);",
            "  }",
            "}",
            "return stack.length === 0;",
          ],
          cpp: [
            "vector<char> stack;",
            "for (char ch : s) {",
            "  if (isCloser(ch)) {",
            "    if (stack.empty() || stack.back() != match(ch))",
            "      return false;",
            "    stack.pop_back();",
            "  } else {",
            "    stack.push_back(ch);",
            "  }",
            "}",
            "return stack.empty();",
          ],
        },
        timeComplexity: "O(n)",
        spaceComplexity: "O(n)",
        implementations: {
          python:
`def is_valid(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
        else:
            stack.append(ch)
    return not stack`,
          javascript:
`function isValid(s) {
  const pairs = { ")": "(", "]": "[", "}": "{" };
  const stack = [];
  for (const ch of s) {
    if (ch in pairs) {
      if (stack.pop() !== pairs[ch]) return false;
    } else {
      stack.push(ch);
    }
  }
  return stack.length === 0;
}`,
          cpp:
`bool isValid(const string& s) {
    unordered_map<char, char> pairs = {
        {')', '('}, {']', '['}, {'}', '{'}};
    vector<char> stack;
    for (char ch : s) {
        if (pairs.count(ch)) {
            if (stack.empty() || stack.back() != pairs[ch])
                return false;
            stack.pop_back();
        } else {
            stack.push_back(ch);
        }
    }
    return stack.empty();
}`,
        },
        questions: [
          { title: "Valid Parentheses", difficulty: "EASY", note: "The pattern itself." },
          { title: "Minimum Remove to Make Valid Parentheses", difficulty: "MEDIUM", note: "Mark bad indices too." },
          { title: "Longest Valid Parentheses", difficulty: "HARD", note: "Stack of indices + lengths." },
        ],
      },
      {
        id: "min-stack",
        name: "Min Stack (O(1) design)",
        idea: "Store the running minimum alongside every pushed value. Each stack frame remembers what the minimum was at that depth, so pops can never corrupt it — all operations stay O(1).",
        pseudocode: {
          python: [
            "push(val): m = min(val, stack[-1].min)",
            "           stack.append(Node(val, m))",
            "pop():  stack.pop()",
            "top():  stack[-1].value",
            "getMin(): stack[-1].min",
          ],
          javascript: [
            "push(val) {",
            "  stack.push({ val, min: Math.min(val, top?.min ?? val) });",
            "}",
            "pop() { stack.pop(); }",
            "top() { return top.val; }",
            "getMin() { return top.min; }",
          ],
          cpp: [
            "void push(int val) {",
            "  int m = st.empty() ? val : min(val, st.back().second);",
            "  st.push_back({val, m});",
            "}",
            "void pop() { st.pop_back(); }",
            "int top() { return st.back().first; }",
            "int getMin() { return st.back().second; }",
          ],
        },
        timeComplexity: "O(1) per op",
        spaceComplexity: "O(n)",
        implementations: {
          python:
`class MinStack:
    def __init__(self):
        self.stack = []  # (value, minSoFar)

    def push(self, val):
        m = min(val, self.stack[-1][1]) if self.stack else val
        self.stack.append((val, m))

    def pop(self):
        self.stack.pop()

    def top(self):
        return self.stack[-1][0]

    def getMin(self):
        return self.stack[-1][1]`,
          javascript:
`class MinStack {
  constructor() {
    this.stack = []; // { val, min }
  }
  push(val) {
    const prev = this.stack[this.stack.length - 1];
    this.stack.push({ val, min: prev ? Math.min(val, prev.min) : val });
  }
  pop() { this.stack.pop(); }
  top() { return this.stack[this.stack.length - 1].val; }
  getMin() { return this.stack[this.stack.length - 1].min; }
}`,
          cpp:
`class MinStack {
    vector<pair<int,int>> st; // {value, minSoFar}
public:
    void push(int val) {
        int m = st.empty() ? val : min(val, st.back().second);
        st.push_back({val, m});
    }
    void pop() { st.pop_back(); }
    int top() { return st.back().first; }
    int getMin() { return st.back().second; }
};`,
        },
        questions: [
          { title: "Min Stack", difficulty: "MEDIUM", note: "The design itself." },
          { title: "Design a Stack With Increment Operation", difficulty: "MEDIUM", note: "Lazy increments trick." },
          { title: "Basic Calculator", difficulty: "HARD", note: "Stack-driven expression parsing." },
        ],
      },
    ],
  },
  "dynamic-programming": {
    slugs: ["dynamic-programming", "dp"],
    algorithms: [
      {
        id: "climbing-stairs",
        name: "Climbing Stairs (1D tabulation)",
        idea: "The smallest DP that exists: ways(n) = ways(n-1) + ways(n-2). Two rolling variables replace the whole table — this is Fibonacci wearing a trench coat.",
        pseudocode: {
          python: [
            "a, b = 1, 1  # ways(0), ways(1)",
            "for _ in range(n - 1):",
            "  a, b = b, a + b",
            "return b",
          ],
          javascript: [
            "let a = 1, b = 1;  // ways(0), ways(1)",
            "for (let i = 1; i < n; i++) {",
            "  [a, b] = [b, a + b];",
            "}",
            "return b;",
          ],
          cpp: [
            "long long a = 1, b = 1;  // ways(0), ways(1)",
            "for (int i = 1; i < n; ++i) {",
            "  long long t = a + b; a = b; b = t;",
            "}",
            "return (int)b;",
          ],
        },
        timeComplexity: "O(n)",
        spaceComplexity: "O(1)",
        implementations: {
          python:
`def climb_stairs(n):
    a, b = 1, 1  # ways(0), ways(1)
    for _ in range(n - 1):
        a, b = b, a + b
    return b`,
          javascript:
`function climbStairs(n) {
  let a = 1, b = 1;
  for (let i = 1; i < n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}`,
          cpp:
`int climbStairs(int n) {
    long long a = 1, b = 1;
    for (int i = 1; i < n; ++i) {
        long long t = a + b;
        a = b;
        b = t;
    }
    return (int)b;
}`,
        },
        questions: [
          { title: "Climbing Stairs", difficulty: "EASY", note: "The pattern itself." },
          { title: "Min Cost Climbing Stairs", difficulty: "EASY", note: "Add a cost to each step." },
          { title: "House Robber", difficulty: "MEDIUM", note: "Same recurrence with a constraint." },
        ],
      },
      {
        id: "knapsack",
        name: "0/1 Knapsack (1D tabulation)",
        idea: "For each item, sweep capacity from high to low — the descending order guarantees each item is used at most once. dp[c] = best value achievable with capacity c. This template covers subset-sum, partition and counting variants.",
        pseudocode: {
          python: [
            "dp = [0] * (cap + 1)",
            "for w, v in items:",
            "  for c in range(cap, w - 1, -1):  # descending!",
            "    dp[c] = max(dp[c], dp[c - w] + v)",
            "return dp[cap]",
          ],
          javascript: [
            "const dp = new Array(cap + 1).fill(0);",
            "for (const [w, v] of items) {",
            "  for (let c = cap; c >= w; c--) {  // descending!",
            "    dp[c] = Math.max(dp[c], dp[c - w] + v);",
            "  }",
            "}",
            "return dp[cap];",
          ],
          cpp: [
            "vector<int> dp(cap + 1, 0);",
            "for (auto& [w, v] : items) {",
            "  for (int c = cap; c >= w; --c) {  // descending!",
            "    dp[c] = max(dp[c], dp[c - w] + v);",
            "  }",
            "}",
            "return dp[cap];",
          ],
        },
        timeComplexity: "O(n · W)",
        spaceComplexity: "O(W)",
        implementations: {
          python:
`def knapsack(weights, values, cap):
    dp = [0] * (cap + 1)
    for w, v in zip(weights, values):
        for c in range(cap, w - 1, -1):
            dp[c] = max(dp[c], dp[c - w] + v)
    return dp[cap]`,
          javascript:
`function knapsack(weights, values, cap) {
  const dp = new Array(cap + 1).fill(0);
  weights.forEach((w, i) => {
    for (let c = cap; c >= w; c--) {
      dp[c] = Math.max(dp[c], dp[c - w] + values[i]);
    }
  });
  return dp[cap];
}`,
          cpp:
`int knapsack(vector<int>& weights, vector<int>& values, int cap) {
    vector<int> dp(cap + 1, 0);
    for (size_t i = 0; i < weights.size(); ++i) {
        for (int c = cap; c >= weights[i]; --c) {
            dp[c] = max(dp[c], dp[c - weights[i]] + values[i]);
        }
    }
    return dp[cap];
}`,
        },
        questions: [
          { title: "Partition Equal Subset Sum", difficulty: "MEDIUM", note: "Boolean flavour of the same loop." },
          { title: "Target Sum", difficulty: "MEDIUM", note: "Subset-sum with signs." },
          { title: "Ones and Zeroes", difficulty: "MEDIUM", note: "2D capacity knapsack." },
        ],
      },
      {
        id: "longest-common-subsequence",
        name: "Longest Common Subsequence (2D DP)",
        idea: "The canonical two-string DP: dp[i][j] answers 'best common suffix of prefixes a[:i], b[:j]'. Matching characters extend the diagonal; mismatches inherit the better neighbour. Master this and every 2D string DP opens up.",
        pseudocode: {
          python: [
            "dp = [[0] * (n + 1) for _ in range(m + 1)]",
            "for i in range(1, m + 1):",
            "  for j in range(1, n + 1):",
            "    if a[i-1] == b[j-1]: dp[i][j] = dp[i-1][j-1] + 1",
            "    else: dp[i][j] = max(dp[i-1][j], dp[i][j-1])",
            "return dp[m][n]",
          ],
          javascript: [
            "const dp = Array.from({ length: m + 1 }, () =>",
            "  new Array(n + 1).fill(0));",
            "for (let i = 1; i <= m; i++) {",
            "  for (let j = 1; j <= n; j++) {",
            "    dp[i][j] = a[i - 1] === b[j - 1]",
            "      ? dp[i - 1][j - 1] + 1",
            "      : Math.max(dp[i - 1][j], dp[i][j - 1]);",
            "  }",
            "}",
            "return dp[m][n];",
          ],
          cpp: [
            "vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));",
            "for (int i = 1; i <= m; ++i) {",
            "  for (int j = 1; j <= n; ++j) {",
            "    dp[i][j] = a[i - 1] == b[j - 1]",
            "      ? dp[i - 1][j - 1] + 1",
            "      : max(dp[i - 1][j], dp[i][j - 1]);",
            "  }",
            "}",
            "return dp[m][n];",
          ],
        },
        timeComplexity: "O(m · n)",
        spaceComplexity: "O(m · n) (O(min(m,n)) rolled)",
        implementations: {
          python:
`def lcs(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]`,
          javascript:
`function lcs(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp[m][n];
}`,
          cpp:
`int lcs(const string& a, const string& b) {
    int m = a.size(), n = b.size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
    for (int i = 1; i <= m; ++i) {
        for (int j = 1; j <= n; ++j) {
            if (a[i - 1] == b[j - 1])
                dp[i][j] = dp[i - 1][j - 1] + 1;
            else
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
        }
    }
    return dp[m][n];
}`,
        },
        questions: [
          { title: "Longest Common Subsequence", difficulty: "MEDIUM", note: "The pattern itself." },
          { title: "Edit Distance", difficulty: "MEDIUM", note: "Same table, three-way min." },
          { title: "Delete Operation for Two Strings", difficulty: "MEDIUM", note: "LCS-derived deletion count." },
        ],
      },
    ],
  },
  math: {
    slugs: ["math"],
    algorithms: [
      {
        id: "sieve-eratosthenes",
        name: "Sieve of Eratosthenes",
        idea: "Mark every multiple of each surviving prime as composite, starting the wipe at p² (smaller multiples were already handled). The classic way to enumerate all primes below n in near-linear time.",
        pseudocode: {
          python: [
            "is_prime = [True] * (n + 1)",
            "for p in range(2, isqrt(n) + 1):",
            "  if is_prime[p]:",
            "    for m in range(p * p, n + 1, p):",
            "      is_prime[m] = False",
            "return [i for i, ok in enumerate(is_prime) if ok]",
          ],
          javascript: [
            "const isPrime = new Array(n + 1).fill(true);",
            "for (let p = 2; p * p <= n; p++) {",
            "  if (isPrime[p]) {",
            "    for (let m = p * p; m <= n; m += p) isPrime[m] = false;",
            "  }",
            "}",
            "return indices where isPrime;",
          ],
          cpp: [
            "vector<bool> isPrime(n + 1, true);",
            "for (int p = 2; p * p <= n; ++p) {",
            "  if (isPrime[p]) {",
            "    for (int m = p * p; m <= n; m += p) isPrime[m] = false;",
            "  }",
            "}",
            "collect indices where isPrime;",
          ],
        },
        timeComplexity: "O(n log log n)",
        spaceComplexity: "O(n)",
        implementations: {
          python:
`def sieve(n):
    is_prime = [True] * (n + 1)
    is_prime[0:2] = [False, False]
    for p in range(2, int(n ** 0.5) + 1):
        if is_prime[p]:
            for m in range(p * p, n + 1, p):
                is_prime[m] = False
    return [i for i, ok in enumerate(is_prime) if ok]`,
          javascript:
`function sieve(n) {
  const isPrime = new Array(n + 1).fill(true);
  isPrime[0] = isPrime[1] = false;
  for (let p = 2; p * p <= n; p++) {
    if (isPrime[p]) {
      for (let m = p * p; m <= n; m += p) isPrime[m] = false;
    }
  }
  return isPrime.reduce(
    (out, ok, i) => (ok ? [...out, i] : out), []
  );
}`,
          cpp:
`vector<int> sieve(int n) {
    vector<bool> isPrime(n + 1, true);
    isPrime[0] = isPrime[1] = false;
    for (int p = 2; p * p <= n; ++p) {
        if (isPrime[p]) {
            for (int m = p * p; m <= n; m += p)
                isPrime[m] = false;
        }
    }
    vector<int> out;
    for (int i = 2; i <= n; ++i)
        if (isPrime[i]) out.push_back(i);
    return out;
}`,
        },
        questions: [
          { title: "Count Primes", difficulty: "MEDIUM", note: "The sieve verbatim." },
          { title: "Prime Arrangements", difficulty: "EASY", note: "Count primes, then permute." },
          { title: "2 Keys Keyboard", difficulty: "MEDIUM", note: "Prime factorisation insight." },
        ],
      },
      {
        id: "euclidean-gcd",
        name: "Euclidean GCD (and LCM)",
        idea: "gcd(a, b) = gcd(b, a mod b) until b hits zero. Loop, don't recurse, in production code — and get LCM for free via a·b / gcd(a, b).",
        pseudocode: {
          python: [
            "while b:",
            "  a, b = b, a % b",
            "return a",
            "lcm(a, b) = a * b // gcd(a, b)",
          ],
          javascript: [
            "while (b !== 0) {",
            "  [a, b] = [b, a % b];",
            "}",
            "return a;",
            "// lcm(a, b) = (a * b) / gcd(a, b)",
          ],
          cpp: [
            "while (b) {",
            "  long long t = a % b; a = b; b = t;",
            "}",
            "return a;",
            "// lcm(a, b) = a / gcd(a, b) * b",
          ],
        },
        timeComplexity: "O(log min(a, b))",
        spaceComplexity: "O(1)",
        implementations: {
          python:
`def gcd(a, b):
    while b:
        a, b = b, a % b
    return a

def lcm(a, b):
    return a * b // gcd(a, b)`,
          javascript:
`function gcd(a, b) {
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

function lcm(a, b) {
  return (a * b) / gcd(a, b);
}`,
          cpp:
`long long gcd(long long a, long long b) {
    while (b) {
        long long t = a % b;
        a = b;
        b = t;
    }
    return a;
}

long long lcm(long long a, long long b) {
    return a / gcd(a, b) * b;
}`,
        },
        questions: [
          { title: "Greatest Common Divisor of Strings", difficulty: "EASY", note: "GCD on lengths." },
          { title: "Find Greatest Common Divisor of Array", difficulty: "EASY", note: "GCD of min and max." },
          { title: "GCD Sort of an Array", difficulty: "HARD", note: "GCD + union-find combo." },
        ],
      },
      {
        id: "fast-modpow",
        name: "Fast Modular Exponentiation",
        idea: "Square the base and halve the exponent each step (binary exponentiation), multiplying into the result on set bits. Turns O(n) multiplications into O(log n) — mandatory once moduli get large.",
        pseudocode: {
          python: [
            "result = 1; base %= mod",
            "while exp:",
            "  if exp & 1: result = result * base % mod",
            "  base = base * base % mod",
            "  exp >>= 1",
            "return result",
          ],
          javascript: [
            "let result = 1n; base %= mod;",
            "while (exp > 0n) {",
            "  if (exp & 1n) result = (result * base) % mod;",
            "  base = (base * base) % mod;",
            "  exp >>= 1n;",
            "}",
            "return result;",
          ],
          cpp: [
            "long long result = 1; base %= mod;",
            "while (exp) {",
            "  if (exp & 1) result = result * base % mod;",
            "  base = base * base % mod;",
            "  exp >>= 1;",
            "}",
            "return result;",
          ],
        },
        timeComplexity: "O(log exp)",
        spaceComplexity: "O(1)",
        implementations: {
          python:
`def mod_pow(base, exp, mod):
    result = 1
    base %= mod
    while exp:
        if exp & 1:
            result = result * base % mod
        base = base * base % mod
        exp >>= 1
    return result`,
          javascript:
`function modPow(base, exp, mod) {
  let result = 1n;
  base %= mod;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod;
    base = (base * base) % mod;
    exp >>= 1n;
  }
  return result;
}`,
          cpp:
`long long modPow(long long base, long long exp, long long mod) {
    long long result = 1;
    base %= mod;
    while (exp) {
        if (exp & 1) result = result * base % mod;
        base = base * base % mod;
        exp >>= 1;
    }
    return result;
}`,
        },
        questions: [
          { title: "Pow(x, n)", difficulty: "MEDIUM", note: "Same halving, negative exponents too." },
          { title: "Super Pow", difficulty: "MEDIUM", note: "Exponent given as a digit array." },
          { title: "Count Good Numbers", difficulty: "MEDIUM", note: "Modpow over digit positions." },
        ],
      },
    ],
  },
  greedy: {
    slugs: ["greedy"],
    algorithms: [
      {
        id: "interval-merging",
        name: "Interval Merging",
        idea: "Sort intervals by start, then fold: each new interval either overlaps the current merged block (extend its end) or starts a fresh block. Sorting is what makes one linear pass correct.",
        pseudocode: {
          python: [
            "sort intervals by start",
            "out = [copy of first interval]",
            "for start, end in remaining:",
            "  if start <= out[-1].end:",
            "    out[-1].end = max(out[-1].end, end)",
            "  else: out.append((start, end))",
          ],
          javascript: [
            "intervals.sort((a, b) => a[0] - b[0]);",
            "const out = [[...intervals[0]]];",
            "for (const [start, end] of intervals.slice(1)) {",
            "  if (start <= out.at(-1)[1]) {",
            "    out.at(-1)[1] = Math.max(out.at(-1)[1], end);",
            "  } else {",
            "    out.push([start, end]);",
            "  }",
            "}",
          ],
          cpp: [
            "sort(ivs.begin(), ivs.end());",
            "vector<vector<int>> out;",
            "for (auto& iv : ivs) {",
            "  if (!out.empty() && iv[0] <= out.back()[1])",
            "    out.back()[1] = max(out.back()[1], iv[1]);",
            "  else",
            "    out.push_back(iv);",
            "}",
          ],
        },
        timeComplexity: "O(n log n)",
        spaceComplexity: "O(n) output",
        implementations: {
          python:
`def merge_intervals(intervals):
    intervals.sort(key=lambda iv: iv[0])
    out = [list(intervals[0])]
    for start, end in intervals[1:]:
        if start <= out[-1][1]:
            out[-1][1] = max(out[-1][1], end)
        else:
            out.append([start, end])
    return out`,
          javascript:
`function mergeIntervals(intervals) {
  intervals.sort((a, b) => a[0] - b[0]);
  const out = [[...intervals[0]]];
  for (const [start, end] of intervals.slice(1)) {
    if (start <= out[out.length - 1][1]) {
      out[out.length - 1][1] =
        Math.max(out[out.length - 1][1], end);
    } else {
      out.push([start, end]);
    }
  }
  return out;
}`,
          cpp:
`vector<vector<int>> mergeIntervals(vector<vector<int>>& ivs) {
    sort(ivs.begin(), ivs.end());
    vector<vector<int>> out;
    for (auto& iv : ivs) {
        if (!out.empty() && iv[0] <= out.back()[1]) {
            out.back()[1] = max(out.back()[1], iv[1]);
        } else {
            out.push_back(iv);
        }
    }
    return out;
}`,
        },
        questions: [
          { title: "Merge Intervals", difficulty: "MEDIUM", note: "The pattern itself." },
          { title: "Insert Interval", difficulty: "MEDIUM", note: "Merge around one new interval." },
          { title: "Non-overlapping Intervals", difficulty: "MEDIUM", note: "Count what must be removed." },
        ],
      },
      {
        id: "jump-game",
        name: "Jump Game (farthest reach)",
        idea: "Track the farthest index reachable so far. If your current index ever passes it, you're stuck; otherwise every visited index extends the frontier. One greedy scan replaces all path exploration.",
        pseudocode: {
          python: [
            "reach = 0",
            "for i, step in enumerate(nums):",
            "  if i > reach: return False",
            "  reach = max(reach, i + step)",
            "return reach >= len(nums) - 1",
          ],
          javascript: [
            "let reach = 0;",
            "for (let i = 0; i < nums.length; i++) {",
            "  if (i > reach) return false;",
            "  reach = Math.max(reach, i + nums[i]);",
            "}",
            "return reach >= nums.length - 1;",
          ],
          cpp: [
            "int reach = 0;",
            "for (int i = 0; i < (int)nums.size(); ++i) {",
            "  if (i > reach) return false;",
            "  reach = max(reach, i + nums[i]);",
            "}",
            "return reach >= (int)nums.size() - 1;",
          ],
        },
        timeComplexity: "O(n)",
        spaceComplexity: "O(1)",
        implementations: {
          python:
`def can_jump(nums):
    reach = 0
    for i, step in enumerate(nums):
        if i > reach:
            return False
        reach = max(reach, i + step)
    return reach >= len(nums) - 1`,
          javascript:
`function canJump(nums) {
  let reach = 0;
  for (let i = 0; i < nums.length; i++) {
    if (i > reach) return false;
    reach = Math.max(reach, i + nums[i]);
  }
  return reach >= nums.length - 1;
}`,
          cpp:
`bool canJump(vector<int>& nums) {
    int reach = 0;
    for (int i = 0; i < (int)nums.size(); ++i) {
        if (i > reach) return false;
        reach = max(reach, i + nums[i]);
    }
    return reach >= (int)nums.size() - 1;
}`,
        },
        questions: [
          { title: "Jump Game", difficulty: "MEDIUM", note: "The pattern itself." },
          { title: "Jump Game II", difficulty: "MEDIUM", note: "Count jumps with an implicit BFS layer." },
          { title: "Video Stitching", difficulty: "MEDIUM", note: "Same frontier over clips." },
        ],
      },
      {
        id: "activity-selection",
        name: "Activity Selection (sort by end)",
        idea: "To pack the most non-overlapping activities, always take the one that frees you earliest: sort by end time, greedily keep anything that starts at or after the last kept end. The exchange argument makes this provably optimal.",
        pseudocode: {
          python: [
            "sort intervals by end",
            "count = 0; free = -inf",
            "for start, end in intervals:",
            "  if start >= free:",
            "    count += 1; free = end",
            "return count",
          ],
          javascript: [
            "intervals.sort((a, b) => a[1] - b[1]);",
            "let count = 0, free = -Infinity;",
            "for (const [start, end] of intervals) {",
            "  if (start >= free) {",
            "    count++; free = end;",
            "  }",
            "}",
            "return count;",
          ],
          cpp: [
            "sort by end time;",
            "int count = 0; long long free_ = LLONG_MIN;",
            "for (auto& iv : ivs) {",
            "  if (iv[0] >= free_) {",
            "    count++; free_ = iv[1];",
            "  }",
            "}",
            "return count;",
          ],
        },
        timeComplexity: "O(n log n)",
        spaceComplexity: "O(1) (excluding sort)",
        implementations: {
          python:
`def max_activities(intervals):
    intervals.sort(key=lambda iv: iv[1])
    count = 0
    free = float("-inf")
    for start, end in intervals:
        if start >= free:
            count += 1
            free = end
    return count`,
          javascript:
`function maxActivities(intervals) {
  intervals.sort((a, b) => a[1] - b[1]);
  let count = 0;
  let free = -Infinity;
  for (const [start, end] of intervals) {
    if (start >= free) {
      count += 1;
      free = end;
    }
  }
  return count;
}`,
          cpp:
`int maxActivities(vector<vector<int>>& ivs) {
    sort(ivs.begin(), ivs.end(),
        [](auto& a, auto& b) { return a[1] < b[1]; });
    int count = 0;
    long long free_ = LLONG_MIN;
    for (auto& iv : ivs) {
        if (iv[0] >= free_) {
            count += 1;
            free_ = iv[1];
        }
    }
    return count;
}`,
        },
        questions: [
          { title: "Non-overlapping Intervals", difficulty: "MEDIUM", note: "n − kept = removals." },
          { title: "Minimum Number of Arrows to Burst Balloons", difficulty: "MEDIUM", note: "Overlap counting variant." },
          { title: "Assign Cookies", difficulty: "EASY", note: "Greedy matching warm-up." },
        ],
      },
    ],
  },
};
