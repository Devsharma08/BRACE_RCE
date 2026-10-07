/**
 * Problem x language correctness matrix.
 *
 * The existing suites cover the two ends of the risk curve but nothing in the
 * middle:
 *
 *   verify_execution.ts    893 bank cases, but JavaScript only.
 *   verify_wrapper_shapes.ts  50 cases across 5 languages, but synthetic
 *                              one-case shapes with hand-written stdin.
 *
 * So a wrapper could be correct for a synthetic `int[] + int` shape and still
 * be wrong for a real stored problem — or correct on one stored problem and
 * wrong on another shape. That gap is where the P0s lived: none of them showed
 * up in either suite.
 *
 * This runs REAL problems, with their REAL stored test cases pulled from the
 * database, through every supported language, and requires each output line to
 * equal the stored expected output. It also drives java/cpp through the batched
 * framing, so the batching path is exercised against real multi-case data rather
 * than only the synthetic three-case batch in the shape suite.
 *
 * It is deliberately a CATALOGUE, not a scan of every problem: correct
 * non-JavaScript reference solutions do not exist yet for most of the bank, so
 * a full 194 x 5 sweep would be mostly skipped. Growth rule: add a problem here
 * once a reference exists for each language, and it becomes a permanent gate.
 */
import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import { prepareFinalCode, SANDBOX_BUDGETS, fireOnPiston, supportsBatching } from '../services/codeExecution.js';

const PISTON = process.env.PISTON_URL ?? 'http://localhost:2000';

const LANG: Record<string, string> = {
  javascript: 'javascript', python: 'python', java: 'java', cpp: 'c++', c: 'c',
};
const FILE_NAME: Record<string, string> = {
  javascript: 'main.js', python: 'main.py', java: 'Main.java', cpp: 'main.cpp', c: 'main.c',
};
type Lang = keyof typeof LANG;
const LANGS = Object.keys(LANG) as Lang[];

type Ref = Partial<Record<Lang, string>>;

type ProblemSpec = {
  name: string;
  /**
   * Legacy rows carry a stable github_oid; bank rows do not (the bank seeder
   * never writes one), so bank entries identify their row by problem_number —
   * which, unlike Problem.id, survives every reseed on every deployment.
   */
  oid?: string;
  number?: number;
  /**
   * The problem's real stored cases, copied from the database in `id asc`
   * order — the same order `executeCode` pins, so a batched run here sees the
   * case sequence a user's submission would.
   *
   * The runner prefers the live DB copy when it exists, so drift between this
   * file and the database is itself a failure. The embedded copy exists so a
   * fresh CI database with no rows still runs this as a gate.
   */
  cases: [string, string][];
  /** Correct reference per language. Absent = skipped, with a stated reason. */
  refs: Ref;
  /** Languages deliberately excluded, each a place a defect could hide. */
  skip?: Partial<Record<Lang, string>>;
};

const SPECS: ProblemSpec[] = [
{
    name: 'Two Sum',
        cases: [
        ['[]\n0', '[]'],
        ['[3,3]\n6', '[0,1]'],
        ['[5]\n5', '[]'],
        ['[-4,7,12,3,-9,6]\n2', '[0,5]'],
        ['[-13,17,7]\n-6', '[0,2]'],
        ['[-10,-11]\n-21', '[0,1]'],
        ['[-8,5,-6,9,-14,20,-4]\n-14', '[0,2]'],
        ['[3,2,4]\n6', '[1,2]'],
        ['[-13,-1,7,-18,7,14,20,11]\n-6', '[0,2]'],
        ['[-14,8,2]\n10', '[1,2]'],
        ['[4,-20,-4,8,1,20,-14,-6,-7]\n-26', '[1,7]'],
        ['[-17,4,-16,-13,-12,11,17,2,-14,10]\n-2', '[3,5]'],
        ['[8,-2,-11,-16,16,7,16,15,17,2]\n-14', '[3,9]'],
        ['[10,-8,5,-12,16,6]\n11', '[2,5]'],
        ['[2,7,11,15]\n9', '[0,1]'],
    ],
    oid: '67a013521d80b36dba6b2d0b1f9bf2b824c79028',
    // int[] + int -> int[]. The array is the first stdin line, the target the
    // second, so this also guards the C synthetic-size off-by-one.
    refs: {
      javascript:
        'function twoSum(nums, target){const seen={};for(let i=0;i<nums.length;i++){const need=target-nums[i];if(seen[need]!==undefined)return [seen[need],i];seen[nums[i]]=i;}return [];}',
      python:
        'class Solution:\n    def twoSum(self, nums, target):\n        seen = {}\n        for i, v in enumerate(nums):\n            if target - v in seen:\n                return [seen[target - v], i]\n            seen[v] = i\n        return []',
      java:
        'class Solution { public int[] twoSum(int[] nums,int target){ java.util.Map<Integer,Integer> seen=new java.util.HashMap<>(); for(int i=0;i<nums.length;i++){int need=target-nums[i]; if(seen.containsKey(need)) return new int[]{seen.get(need),i}; seen.put(nums[i],i);} return new int[0]; } }',
      cpp:
        'class Solution { public: std::vector<int> twoSum(std::vector<int>& nums,int target){ std::unordered_map<int,int> seen; for(int i=0;i<(int)nums.size();i++){int need=target-nums[i]; if(seen.count(need)) return {seen[need],i}; seen[nums[i]]=i;} return {}; } };',
      c:
        'int* twoSum(int* nums,int numsSize,int target,int* returnSize){ for(int i=0;i<numsSize;i++) for(int j=i+1;j<numsSize;j++) if(nums[i]+nums[j]==target){int* o=(int*)malloc(sizeof(int)*2);o[0]=i;o[1]=j;*returnSize=2;return o;} *returnSize=0; return NULL; }',
    },
  },
  {
    name: 'Best Time to Buy and Sell Stock',
        cases: [
        ['[40,5,29,14,34,28,14,3,16]', '29'],
        ['[13,23,7,32]', '25'],
        ['[7,26,37,1,30,24,34]', '33'],
        ['[7,6,4,3,1]', '0'],
        ['[]', '0'],
        ['[13,35,29,3,22,4,29,2,13,35,27,31]', '33'],
        ['[27,13]', '0'],
        ['[32]', '0'],
        ['[7,1,5,3,6,4]', '5'],
        ['[1]', '0'],
        ['[14,39,9,10]', '25'],
        ['[16,30,12,9,35,16]', '26'],
        ['[22,6,18,31,7,12,12,20,24,8,31,28]', '25'],
        ['[1,2]', '1'],
        ['[5,33,9,4,33,9]', '29'],
    ],
    oid: 'abd9bcf674fde34a7cd15f1c2178e37f573fabe3',
    // int[] -> int. Single return scalar, so it exercises a different printer
    // from Two Sum's array return.
    refs: {
      javascript:
        'function maxProfit(prices){let best=0,low=Infinity;for(const p of prices){if(p<low)low=p;else if(p-low>best)best=p-low;}return best;}',
      python:
        'class Solution:\n    def maxProfit(self, prices):\n        best = 0\n        low = float("inf")\n        for p in prices:\n            if p < low:\n                low = p\n            elif p - low > best:\n                best = p - low\n        return best',
      java:
        'class Solution { public int maxProfit(int[] prices){ int best=0; int low=Integer.MAX_VALUE; for(int p: prices){ if(p<low) low=p; else if(p-low>best) best=p-low; } return best; } }',
      cpp:
        'class Solution { public: int maxProfit(std::vector<int>& prices){ int best=0; int low=2147483647; for(int p: prices){ if(p<low) low=p; else if(p-low>best) best=p-low; } return best; } };',
      c:
        'int maxProfit(int* prices,int pricesSize){ int best=0,low=2147483647; for(int i=0;i<pricesSize;i++){ if(prices[i]<low) low=prices[i]; else if(prices[i]-low>best) best=prices[i]-low; } return best; }',
    },
  },
  {
    name: 'Maximum Depth of Binary Tree',
        cases: [
        ['[8,4,9,5,7,3,1,2,6,11,12,10]', '4'],
        ['[3,9,20,null,null,15,7]', '3'],
        ['[4,5,7,6,3,1,2,8]', '4'],
        ['[4,3,2,5,6,1]', '3'],
        ['[6,5,7,3,8,4,2,10,9,1]', '4'],
        ['[8,2,7,6,3,4,1,5,9]', '4'],
        ['[1]', '1'],
        ['[4,2,5,3,1,6]', '3'],
        ['[]', '0'],
        ['[1,null,2]', '2'],
        ['[4,11,5,9,3,2,1,8,7,10,6,12]', '4'],
        ['[8,12,5,3,2,11,6,7,10,4,9,1]', '4'],
        ['[7,8,10,2,3,12,6,4,11,9,5,1]', '4'],
        ['[11,5,3,6,2,1,10,7,8,4,9]', '4'],
        ['[1,2,3,4,5,null,null,6]', '4'],
    ],
    oid: 'c2f93388b31584a8711a0c2fdac3a8525b33c550',
    // TreeNode -> int. Stored input is level-order with nulls, which is the
    // encoding the wrappers must reconstruct before the depth can be computed.
    // C is excluded: its driver has no tree argument parser, so a C reference
    // could not be reached by the generated wrapper at all.
    refs: {
      javascript:
        'function maxDepth(root){ if(!root) return 0; const q=[root]; let d=0; while(q.length){ const n=q.length; for(let i=0;i<n;i++){ const cur=q.shift(); if(cur.left) q.push(cur.left); if(cur.right) q.push(cur.right); } d++; } return d; }',
      python:
        'class Solution:\n    def maxDepth(self, root):\n        if not root:\n            return 0\n        q, d = [root], 0\n        while q:\n            for _ in range(len(q)):\n                cur = q.pop(0)\n                if cur.left: q.append(cur.left)\n                if cur.right: q.append(cur.right)\n            d += 1\n        return d',
      java:
        'class Solution { public int maxDepth(TreeNode root){ if(root==null) return 0; java.util.Queue<TreeNode> q=new java.util.ArrayDeque<>(); q.add(root); int d=0; while(!q.isEmpty()){ int n=q.size(); for(int i=0;i<n;i++){ TreeNode c=q.poll(); if(c.left!=null) q.add(c.left); if(c.right!=null) q.add(c.right); } d++; } return d; } }',
      cpp:
        'class Solution { public: int maxDepth(TreeNode* root){ if(!root) return 0; std::queue<TreeNode*> q; q.push(root); int d=0; while(!q.empty()){ size_t n=q.size(); for(size_t i=0;i<n;i++){ TreeNode* c=q.front(); q.pop(); if(c->left) q.push(c->left); if(c->right) q.push(c->right); } d++; } return d; } };',
    },
    skip: { c: 'no tree argument parser in the C driver' },
  },
  {
    name: 'Shortest Unique Prefix',
    number: 192,
    cases: [
        ['["a"]', '[1]'],
        ['["bba","bba","bbbb"]', '[-1,-1,3]'],
        ['["a","a","ab"]', '[-1,-1,2]'],
        ['[]', '[]'],
        ['["apple","app"]', '[4,-1]'],
        ['["ab","ab","b","aab"]', '[-1,-1,1,2]'],
        ['["bbaa","a","a","a"]', '[1,-1,-1,-1]'],
        ['["aa","bbba"]', '[1,1]'],
        ['["bbb","baab"]', '[2,2]'],
        ['["baa"]', '[1]'],
        ['["abc","abd"]', '[3,3]'],
        ['["dog","dogdog","dodge"]', '[-1,4,3]'],
        ['["bbb","b","a","abba","bbb"]', '[-1,-1,-1,2,-1]'],
        ['["abab","b"]', '[1,1]'],
        ['["ab","baaa","aab","abaa","b"]', '[-1,2,2,3,-1]'],
    ],
    // int[](string[]) - unique prefixes; exercises the C string[] argument path plus an int[] return.
    refs: {
      javascript: 'function shortestUniquePrefixes(words){const out=[];for(const w of words){let ans=-1;for(let L=1;L<=w.length;L++){const pre=w.slice(0,L);let cnt=0;for(const o of words){if(o.slice(0,L)===pre)cnt++;}if(cnt===1){ans=L;break;}}out.push(ans);}return out;}',
      python: 'class Solution:\n    def shortestUniquePrefixes(self, words):\n        out = []\n        for w in words:\n            ans = -1\n            for L in range(1, len(w)+1):\n                pre = w[:L]\n                cnt = 0\n                for o in words:\n                    if o[:L] == pre:\n                        cnt += 1\n                if cnt == 1:\n                    ans = L\n                    break\n            out.append(ans)\n        return out',
      java: 'class Solution { public int[] shortestUniquePrefixes(String[] words){ int[] out=new int[words.length]; for(int x=0;x<words.length;x++){ String w=words[x]; int ans=-1; for(int L=1;L<=w.length();L++){ String pre=w.substring(0,L); int cnt=0; for(String o:words){ if(o.length()>=L&&o.substring(0,L).equals(pre))cnt++; } if(cnt==1){ ans=L; break; } } out[x]=ans; } return out; } }',
      cpp: 'class Solution { public: std::vector<int> shortestUniquePrefixes(std::vector<std::string> words){ std::vector<int> out; for(const std::string& w:words){ int ans=-1; for(int L=1;L<=(int)w.size();L++){ int cnt=0; for(const std::string& o:words){ if((int)o.size()>=L&&o.compare(0,L,w,0,L)==0)cnt++; } if(cnt==1){ ans=L; break; } } out.push_back(ans); } return out; } };',
      c: 'int* shortestUniquePrefixes(char** words,int wordsSize,int* returnSize){ int* out=(int*)malloc(sizeof(int)*wordsSize); for(int x=0;x<wordsSize;x++){ int wl=(int)strlen(words[x]); int ans=-1; for(int L=1;L<=wl;L++){ int cnt=0; for(int o=0;o<wordsSize;o++){ if((int)strlen(words[o])>=L&&strncmp(words[o],words[x],L)==0)cnt++; } if(cnt==1){ ans=L; break; } } out[x]=ans; } *returnSize=wordsSize; return out; }',
    },
  },
  {
    name: 'Maximum Subarray',
    number: 200,
    cases: [
        ['[0,0,0,0]', '0'],
        ['[-1]', '-1'],
        ['[-2,1,-3,4,-1,2,1,-5,4]', '6'],
        ['[-4,10,10,12,15,-7,-2,16,-10,12,-17,-3,20,-3]', '56'],
        ['[1]', '1'],
        ['[-3,-2,-5]', '-2'],
        ['[-3,4,-14,-5,-7,-18,-11,-15,-3]', '4'],
        ['[19,19,1,-4,-14,-19,-1,-4]', '39'],
        ['[-4,14,-6,-11,7,3,-5,-3,16]', '18'],
        ['[8,-3]', '8'],
        ['[-16,16,11]', '27'],
        ['[8,0,17]', '25'],
        ['[5,4,-1,7,8]', '23'],
        ['[-4,18,13,-7,14,-19,-16,-19,-3,17,3,-5,-9,-11]', '38'],
        ['[10]', '10'],
    ],
    // int(int[]) - Kadane; negatives in every direction.
    refs: {
      javascript: 'function maxSubArray(nums){let best=nums[0],run=nums[0];for(let i=1;i<nums.length;i++){run=Math.max(nums[i],run+nums[i]);if(run>best)best=run;}return best;}',
      python: 'class Solution:\n    def maxSubArray(self, nums):\n        best = run = nums[0]\n        for v in nums[1:]:\n            run = max(v, run + v)\n            if run > best:\n                best = run\n        return best',
      java: 'class Solution { public int maxSubArray(int[] nums){ int best=nums[0],run=nums[0]; for(int i=1;i<nums.length;i++){ run=Math.max(nums[i],run+nums[i]); if(run>best)best=run; } return best; } }',
      cpp: 'class Solution { public: int maxSubArray(std::vector<int>& nums){ int best=nums[0],run=nums[0]; for(size_t i=1;i<nums.size();i++){ int ext=run+nums[i]; run=(ext>nums[i]?ext:nums[i]); if(run>best)best=run; } return best; } };',
      c: 'int maxSubArray(int* nums,int numsSize){ int best=nums[0],run=nums[0]; for(int i=1;i<numsSize;i++){ int ext=run+nums[i]; run=(ext>nums[i]?ext:nums[i]); if(run>best)best=run; } return best; }',
    },
  },
  {
    name: 'Two Sum Sorted Array',
    number: 202,
    cases: [
        ['[-19,-17,-10,-3,10,20]\n1', '[0,5]'],
        ['[-3,19]\n16', '[0,1]'],
        ['[-5,-2,0,3]\n-2', '[0,3]'],
        ['[1,2,3,4]\n10', '[]'],
        ['[-12,-11,-6,-5,-2,4,10]\n-2', '[0,6]'],
        ['[-17,-15,-13,-3,11,14,14]\n-3', '[0,6]'],
        ['[-19,8]\n-11', '[0,1]'],
        ['[1,2]\n100', '[]'],
        ['[2,3,4]\n5', '[0,1]'],
        ['[-13,9,14,15]\n2', '[0,3]'],
        ['[-15,-14,-9,14]\n-1', '[0,3]'],
        ['[2,7,11,15]\n9', '[0,1]'],
        ['[-12,-9,-6,-2,-2,4,7,9,19]\n7', '[0,8]'],
        ['[3,5]\n8', '[0,1]'],
        ['[-20,2,10]\n-10', '[0,2]'],
    ],
    // int[](int[], int) - two pointers; empty array when no pair exists.
    refs: {
      javascript: 'function twoSumSorted(nums,target){let lo=0,hi=nums.length-1;while(lo<hi){const s=nums[lo]+nums[hi];if(s===target)return[lo,hi];if(s<target)lo++;else hi--;}return[];}',
      python: 'class Solution:\n    def twoSumSorted(self, nums, target):\n        lo, hi = 0, len(nums) - 1\n        while lo < hi:\n            s = nums[lo] + nums[hi]\n            if s == target:\n                return [lo, hi]\n            if s < target:\n                lo += 1\n            else:\n                hi -= 1\n        return []',
      java: 'class Solution { public int[] twoSumSorted(int[] nums,int target){ int lo=0,hi=nums.length-1; while(lo<hi){ int s=nums[lo]+nums[hi]; if(s==target)return new int[]{lo,hi}; if(s<target)lo++; else hi--; } return new int[0]; } }',
      cpp: 'class Solution { public: std::vector<int> twoSumSorted(std::vector<int>& nums,int target){ int lo=0,hi=(int)nums.size()-1; while(lo<hi){ int s=nums[lo]+nums[hi]; if(s==target)return {lo,hi}; if(s<target)lo++; else hi--; } return {}; } };',
      c: 'int* twoSumSorted(int* nums,int numsSize,int target,int* returnSize){ int lo=0,hi=numsSize-1; while(lo<hi){ int s=nums[lo]+nums[hi]; if(s==target){ int* o=(int*)malloc(sizeof(int)*2); o[0]=lo; o[1]=hi; *returnSize=2; return o; } if(s<target)lo++; else hi--; } *returnSize=0; return NULL; }',
    },
  },
  {
    name: 'Product of Array Without Division',
    number: 203,
    cases: [
        ['[2,2,1,2,1,1]', '[4,4,8,4,8,8]'],
        ['[4,-2,-1,1,1,3]', '[6,-12,-24,24,24,8]'],
        ['[5,1,4,2]', '[8,40,10,20]'],
        ['[0,2]', '[2,0]'],
        ['[1,2,3,4]', '[24,12,8,6]'],
        ['[-1,-2,-3]', '[6,3,2]'],
        ['[3,1]', '[1,3]'],
        ['[-1,1,0,-3,3]', '[0,0,9,0,0]'],
        ['[-3,-2,4,-1,-3]', '[-24,-36,18,-72,-24]'],
        ['[2,3]', '[3,2]'],
        ['[-1,0,1,-1,-3,1]', '[0,-3,0,0,0,0]'],
        ['[-2,1,0,-2,-2,1,3,4]', '[0,0,-96,0,0,0,0,0]'],
        ['[0,0]', '[0,0]'],
        ['[-4,2,-1,1]', '[-2,4,-8,8]'],
        ['[-3,3]', '[3,-3]'],
    ],
    // int[](int[]) - prefix/suffix product, no division.
    refs: {
      javascript: 'function productExceptSelf(nums){const n=nums.length;const out=new Array(n).fill(1);let pre=1;for(let i=0;i<n;i++){out[i]=pre;pre*=nums[i];}let suf=1;for(let i=n-1;i>=0;i--){out[i]*=suf;suf*=nums[i];}return out;}',
      python: 'class Solution:\n    def productExceptSelf(self, nums):\n        n = len(nums)\n        out = [1] * n\n        pre = 1\n        for i in range(n):\n            out[i] = pre\n            pre *= nums[i]\n        suf = 1\n        for i in range(n - 1, -1, -1):\n            out[i] *= suf\n            suf *= nums[i]\n        return out',
      java: 'class Solution { public int[] productExceptSelf(int[] nums){ int n=nums.length; int[] out=new int[n]; int pre=1; for(int i=0;i<n;i++){ out[i]=pre; pre*=nums[i]; } int suf=1; for(int i=n-1;i>=0;i--){ out[i]*=suf; suf*=nums[i]; } return out; } }',
      cpp: 'class Solution { public: std::vector<int> productExceptSelf(std::vector<int>& nums){ int n=(int)nums.size(); std::vector<int> out(n,1); int pre=1; for(int i=0;i<n;i++){ out[i]=pre; pre*=nums[i]; } int suf=1; for(int i=n-1;i>=0;i--){ out[i]*=suf; suf*=nums[i]; } return out; } };',
      c: 'int* productExceptSelf(int* nums,int numsSize,int* returnSize){ int* out=(int*)malloc(sizeof(int)*numsSize); int pre=1; for(int i=0;i<numsSize;i++){ out[i]=pre; pre*=nums[i]; } int suf=1; for(int i=numsSize-1;i>=0;i--){ out[i]*=suf; suf*=nums[i]; } *returnSize=numsSize; return out; }',
    },
  },
  {
    name: 'Interval List Intersections',
    number: 205,
    cases: [
        ['[]\n[[1,2]]', '[]'],
        ['[]\n[[1,3],[4,4],[6,7],[9,10]]', '[]'],
        ['[[1,2]]\n[[3,4]]', '[]'],
        ['[[1,3],[5,9]]\n[]', '[]'],
        ['[[0,2],[5,10],[13,23],[24,25]]\n[[1,5],[8,12],[15,24],[25,26]]', '[[1,2],[8,10],[15,23]]'],
        ['[[0,0],[1,4],[7,7]]\n[[0,0],[1,1],[4,4]]', '[]'],
        ['[[0,0],[2,4],[6,6],[8,10]]\n[]', '[]'],
        ['[[1,4],[6,8],[9,12],[15,16],[17,20]]\n[[1,1],[4,6]]', '[]'],
        ['[[1,4]]\n[[1,2],[4,5],[7,7],[10,13],[14,17]]', '[[1,2]]'],
        ['[[1,2],[4,4],[5,7]]\n[]', '[]'],
        ['[[1,4],[6,8],[9,9],[12,12],[13,14]]\n[[2,3],[5,8],[10,11],[14,16]]', '[[2,3],[6,8]]'],
        ['[[2,5]]\n[[0,1],[4,5]]', '[[4,5]]'],
        ['[[1,2]]\n[[1,2]]', '[[1,2]]'],
        ['[[2,3],[5,7],[10,11],[14,17]]\n[[1,2],[4,5],[7,9],[12,12],[15,16]]', '[[15,16]]'],
        ['[]\n[[2,2],[4,7],[9,10],[12,14],[15,16]]', '[]'],
    ],
    // int[][](int[][], int[][]) - 2D on both sides; half-open intervals, ties advance the second pointer.
    refs: {
      javascript: 'function intersectIntervals(first,second){const out=[];let i=0,j=0;while(i<first.length&&j<second.length){const lo=Math.max(first[i][0],second[j][0]);const hi=Math.min(first[i][1],second[j][1]);if(lo<hi)out.push([lo,hi]);if(first[i][1]<second[j][1])i++;else j++;}return out;}',
      python: 'class Solution:\n    def intersectIntervals(self, first, second):\n        out = []\n        i = j = 0\n        while i < len(first) and j < len(second):\n            lo = max(first[i][0], second[j][0])\n            hi = min(first[i][1], second[j][1])\n            if lo < hi:\n                out.append([lo, hi])\n            if first[i][1] < second[j][1]:\n                i += 1\n            else:\n                j += 1\n        return out',
      java: 'class Solution { public int[][] intersectIntervals(int[][] first,int[][] second){ java.util.ArrayList<int[]> out=new java.util.ArrayList<>(); int i=0,j=0; while(i<first.length&&j<second.length){ int lo=Math.max(first[i][0],second[j][0]); int hi=Math.min(first[i][1],second[j][1]); if(lo<hi)out.add(new int[]{lo,hi}); if(first[i][1]<second[j][1])i++; else j++; } int[][] res=new int[out.size()][]; for(int k=0;k<res.length;k++)res[k]=out.get(k); return res; } }',
      cpp: 'class Solution { public: std::vector<std::vector<int>> intersectIntervals(std::vector<std::vector<int>>& first,std::vector<std::vector<int>>& second){ std::vector<std::vector<int>> out; size_t i=0,j=0; while(i<first.size()&&j<second.size()){ int lo=first[i][0]>second[j][0]?first[i][0]:second[j][0]; int hi=first[i][1]<second[j][1]?first[i][1]:second[j][1]; if(lo<hi)out.push_back({lo,hi}); if(first[i][1]<second[j][1])i++; else j++; } return out; } };',
    },
    skip: { c: 'no int[][] argument parser or return printer in the C driver' },
  },
  {
    name: 'Greatest Common Divisor',
    number: 240,
    cases: [
        ['43540\n55765', '5'],
        ['1\n1', '1'],
        ['3588\n46295', '1'],
        ['100\n75', '25'],
        ['56814\n32595', '3'],
        ['61047\n59515', '1'],
        ['80340\n25098', '6'],
        ['18327\n26759', '1'],
        ['69623\n48943', '1'],
        ['9\n9', '9'],
        ['12\n18', '6'],
        ['5\n7', '1'],
        ['18273\n52332', '3'],
        ['43399\n26439', '1'],
        ['17\n5', '1'],
    ],
    // int(int, int) - Euclid; stored cases are all-positive.
    refs: {
      javascript: 'function gcd(a,b){while(b!==0){const t=b;b=a%b;a=t;}return a;}',
      python: 'class Solution:\n    def gcd(self, a, b):\n        while b != 0:\n            a, b = b, a % b\n        return a',
      java: 'class Solution { public int gcd(int a,int b){ while(b!=0){ int t=b; b=a%b; a=t; } return a; } }',
      cpp: 'class Solution { public: int gcd(int a,int b){ while(b!=0){ int t=b; b=a%b; a=t; } return a; } };',
      c: 'int gcd(int a,int b){ while(b!=0){ int t=b; b=a%b; a=t; } return a; }',
    },
  },
  {
    name: 'Convert Integer to Base',
    number: 245,
    cases: [
        ['193030\n11', '"122032"'],
        ['739519\n6', '"23503411"'],
        ['231813\n4', '"320212011"'],
        ['625786\n13', '"18BAB5"'],
        ['5\n2', '"101"'],
        ['304723\n10', '"304723"'],
        ['533153\n16', '"822A1"'],
        ['1\n2', '"1"'],
        ['255\n16', '"FF"'],
        ['473300\n13', '"137579"'],
        ['35942\n8', '"106146"'],
        ['100\n10', '"100"'],
        ['578449\n7', '"4626304"'],
        ['0\n2', '"0"'],
        ['35\n36', '"Z"'],
    ],
    // string(int, int) - digit table; C has no string return printer.
    refs: {
      javascript: 'function toBase(n,b){const digits=\'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ\';if(n===0)return \'0\';let out=\'\';while(n>0){out=digits[n%b]+out;n=Math.floor(n/b);}return out;}',
      python: 'class Solution:\n    def toBase(self, n, b):\n        digits = \'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ\'\n        if n == 0:\n            return \'0\'\n        out = \'\'\n        while n > 0:\n            out = digits[n % b] + out\n            n //= b\n        return out',
      java: 'class Solution { public String toBase(int n,int b){ String digits="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"; if(n==0)return "0"; StringBuilder out=new StringBuilder(); while(n>0){ out.insert(0,digits.charAt(n%b)); n/=b; } return out.toString(); } }',
      cpp: 'class Solution { public: std::string toBase(int n,int b){ std::string digits="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"; if(n==0)return "0"; std::string out; while(n>0){ out.insert(out.begin(),digits[n%b]); n/=b; } return out; } };',
    },
    skip: { c: 'no string return printer in the C driver — the default branch prints an int cast of the pointer' },
  },
  {
    name: 'Modular Exponentiation',
    number: 247,
    cases: [
        ['3\n5\n11', '1'],
        ['24\n28\n867', '489'],
        ['2\n10\n1000', '24'],
        ['5\n1\n3', '2'],
        ['30\n22\n452', '256'],
        ['0\n5\n7', '0'],
        ['7\n0\n5', '1'],
        ['2\n100\n13', '3'],
        ['11\n11\n775', '86'],
        ['1\n17\n60', '1'],
        ['9\n20\n399', '81'],
        ['6\n23\n147', '111'],
        ['29\n28\n540', '241'],
        ['14\n27\n471', '14'],
        ['12\n23\n678', '54'],
    ],
    // int(int, int, int) - intermediates must be 64-bit in the compiled languages.
    refs: {
      javascript: 'function modPow(base,exp,mod){if(mod===1)return 0;base%=mod;let r=1;while(exp>0){if(exp%2===1)r=r*base%mod;base=base*base%mod;exp=Math.floor(exp/2);}return r;}',
      python: 'class Solution:\n    def modPow(self, base, exp, mod):\n        if mod == 1:\n            return 0\n        base %= mod\n        r = 1\n        while exp > 0:\n            if exp % 2 == 1:\n                r = r * base % mod\n            base = base * base % mod\n            exp //= 2\n        return r',
      java: 'class Solution { public int modPow(int base,int exp,int mod){ if(mod==1)return 0; base%=mod; long r=1,b=base,e=exp; while(e>0){ if(e%2==1) r=r*b%mod; b=b*b%mod; e/=2; } return (int)r; } }',
      cpp: 'class Solution { public: int modPow(int base,int exp,int mod){ if(mod==1)return 0; base%=mod; long long r=1,b=base,e=exp; while(e>0){ if(e%2==1) r=r*b%mod; b=b*b%mod; e/=2; } return (int)r; } };',
      c: 'int modPow(int base,int exp,int mod){ if(mod==1)return 0; base%=mod; long long r=1,b=base,e=exp; while(e>0){ if(e%2==1) r=r*b%mod; b=b*b%mod; e/=2; } return (int)r; }',
    },
  },
  {
    name: 'Balanced Bracket Validation',
    number: 250,
    cases: [
        ['"()("', 'false'],
        ['"()[]{}"', 'true'],
        ['"]("', 'false'],
        ['"]"', 'false'],
        ['"([{}])"', 'true'],
        ['")"', 'false'],
        ['"[}"', 'false'],
        ['")["', 'false'],
        ['")]["', 'false'],
        ['"{))}}"', 'false'],
        ['"("', 'false'],
        ['"{[]}"', 'true'],
        ['""', 'true'],
        ['"([)]"', 'false'],
        ['"(()"', 'false'],
    ],
    // boolean(string) - bracket matching.
    refs: {
      javascript: 'function isValid(s){const pairs={\')\':\'(\',\']\':\'[\',\'}\':\'{\'};const st=[];for(const ch of s){if(ch===\'(\'||ch===\'[\'||ch===\'{\')st.push(ch);else if(st.length===0||st.pop()!==pairs[ch])return false;}return st.length===0;}',
      python: 'class Solution:\n    def isValid(self, s):\n        pairs = {\')\': \'(\', \']\': \'[\', \'}\': \'{\'}\n        st = []\n        for ch in s:\n            if ch in \'([{\':\n                st.append(ch)\n            elif not st or st.pop() != pairs.get(ch):\n                return False\n        return len(st) == 0',
      java: 'class Solution { public boolean isValid(String s){ char[] pairs={\')\',\'[\',\']\',\'{\',\'}\'}; java.util.ArrayDeque<Character> st=new java.util.ArrayDeque<>(); for(int i=0;i<s.length();i++){ char ch=s.charAt(i); if(ch==\'(\'||ch==\'[\'||ch==\'{\')st.push(ch); else { char open = ch==\')\'?\'(\':ch==\']\'?\'[\':\'{\'; if(st.isEmpty()||st.pop()!=open)return false; } } return st.isEmpty(); } }',
      cpp: 'class Solution { public: bool isValid(std::string s){ std::string st; for(char ch:s){ if(ch==\'(\'||ch==\'[\'||ch==\'{\')st.push_back(ch); else { char open = ch==\')\'?\'(\':ch==\']\'?\'[\':\'{\'; if(st.empty()||st.back()!=open)return false; st.pop_back(); } } return st.empty(); } };',
      c: 'bool isValid(char* s){ char st[4096]; int top=0; for(int i=0;s[i];i++){ char ch=s[i]; if(ch==\'(\'||ch==\'[\'||ch==\'{\')st[top++]=ch; else { char open = ch==\')\'?\'(\':ch==\']\'?\'[\':\'{\'; if(top==0||st[--top]!=open)return false; } } return top==0; }',
    },
  },
  {
    name: 'Stack with Minimum Query',
    number: 251,
    cases: [
        ['"push:6,8,5|push:8|top|getMin|pop|push:-8,4|push:5|getMin"', '[null,null,null,null,8,5,null,null,null,null,-8]'],
        ['"push:1,5,-1|top|getMin"', '[null,null,null,-1,-1]'],
        ['"push:2|pop|getMin"', '[null,null,null]'],
        ['"push:5|getMin"', '[null,5]'],
        ['"push:-1,-2|pop|getMin"', '[null,null,null,-1]'],
        ['"push:1,5,-2|pop|getMin|getMin"', '[null,null,null,null,1,1]'],
        ['"push:-7|getMin"', '[null,-7]'],
        ['"push:-9|getMin"', '[null,-9]'],
        ['"push:0,-3|getMin"', '[null,null,-3]'],
        ['"push:-7,8|top|pop|getMin|getMin"', '[null,null,8,null,-7,-7]'],
        ['"push:1,2|getMin|getMin"', '[null,null,1,1]'],
        ['"push:-2,0,-3|getMin|pop|top|getMin"', '[null,null,null,-3,null,0,-2]'],
        ['"push:6|getMin|pop|push:-8,-8|push:3,4|getMin"', '[null,6,null,null,null,null,null,-8]'],
        ['"push:1|push:1|pop|getMin"', '[null,null,null,1]'],
        ['"push:-9|top|pop|push:7|pop|push:-4|getMin|pop"', '[null,-9,null,null,null,null,-4,null]'],
    ],
    // string[](string) - output mixes null with numbers; String[]/vector cannot express that, so js+py only.
    refs: {
      javascript: 'function operateStack(s){const values=[],mins=[],out=[];for(const part of String(s).split(\'|\')){const at=part.indexOf(\':\');const name=at===-1?part:part.slice(0,at);const arg=at===-1?\'\':part.slice(at+1);if(name===\'push\'){for(const v of String(arg).split(\',\')){const n=Number(v);values.push(n);mins.push(mins.length===0?n:Math.min(mins[mins.length-1],n));out.push(null);}}else if(name===\'pop\'){values.pop();mins.pop();out.push(null);}else if(name===\'top\'){out.push(values.length?values[values.length-1]:null);}else if(name===\'getMin\'){out.push(mins.length?mins[mins.length-1]:null);}}return out;}',
      python: 'class Solution:\n    def operateStack(self, s):\n        values = []\n        mins = []\n        out = []\n        for part in str(s).split(\'|\'):\n            at = part.find(\':\')\n            name = part if at == -1 else part[:at]\n            arg = \'\' if at == -1 else part[at+1:]\n            if name == \'push\':\n                for v in arg.split(\',\'):\n                    n = int(v)\n                    values.append(n)\n                    mins.append(n if not mins else min(mins[-1], n))\n                    out.append(None)\n            elif name == \'pop\':\n                if values: values.pop()\n                if mins: mins.pop()\n                out.append(None)\n            elif name == \'top\':\n                out.append(values[-1] if values else None)\n            elif name == \'getMin\':\n                out.append(mins[-1] if mins else None)\n        return out',
    },
    skip: { java: 'driver prints String[] JSON-quoted; this output mixes null with unquoted numbers', cpp: 'std::string cannot hold the null entries this output requires, and the printer JSON-quotes strings', c: 'no string[] return printer in the C driver' },
  },
  {
    name: 'Evaluate Reverse Polish Notation',
    number: 252,
    cases: [
        ['["-2","1","-1","4","*","-","*"]', '-10'],
        ['["-5"]', '-5'],
        ['["10","6","9","3","+","-11","*","/","*","17","+","5","+"]', '22'],
        ['["0","0","/","1"]', '1'],
        ['["3","3","+"]', '6'],
        ['["-7","-1","-7","7","/","-","*"]', '0'],
        ['["5"]', '5'],
        ['["2","1","+","3","*"]', '9'],
        ['["4","13","5","/","+"]', '6'],
        ['["1","9","+"]', '10'],
        ['["7","2","-"]', '5'],
        ['["-6","6","8","2","-4","+","-","+","/"]', '0'],
        ['["-9","-3","2","7","/","+","-"]', '-6'],
        ['["-2","-6","-1","-6","+","+","-"]', '11'],
        ['["-5","2","5","-","*"]', '15'],
    ],
    // int(string[]) - division truncates toward zero; 0/0 is guarded (the stored case never reads it).
    refs: {
      javascript: 'function evalRPN(tokens){const st=[];for(const tok of tokens){if(tok===\'+\'||tok===\'-\'||tok===\'*\'||tok===\'/\'){const r=st.pop(),l=st.pop();if(tok===\'+\')st.push(l+r);else if(tok===\'-\')st.push(l-r);else if(tok===\'*\')st.push(l*r);else st.push(Math.trunc(l/r));}else st.push(Number(tok));}return st[st.length-1];}',
      python: 'class Solution:\n    def evalRPN(self, tokens):\n        st = []\n        for tok in tokens:\n            if tok in (\'+\', \'-\', \'*\', \'/\'):\n                r = st.pop()\n                l = st.pop()\n                if tok == \'+\': st.append(l + r)\n                elif tok == \'-\': st.append(l - r)\n                elif tok == \'*\': st.append(l * r)\n                else:\n                    if r == 0:\n                        st.append(0)\n                    else:\n                        q = abs(l) // abs(r)\n                        st.append(-q if (l < 0) != (r < 0) else q)\n            else:\n                st.append(int(tok))\n        return st[-1]',
      java: 'class Solution { public int evalRPN(String[] tokens){ int[] st=new int[tokens.length]; int top=0; for(String tok:tokens){ if(tok.equals("+")||tok.equals("-")||tok.equals("*")||tok.equals("/")){ int r=st[--top],l=st[--top]; if(tok.equals("+"))st[top++]=l+r; else if(tok.equals("-"))st[top++]=l-r; else if(tok.equals("*"))st[top++]=l*r; else st[top++]=(r==0?0:l/r); } else st[top++]=Integer.parseInt(tok); } return st[top-1]; } }',
      cpp: 'class Solution { public: int evalRPN(std::vector<std::string> tokens){ std::vector<int> st; for(const std::string& tok:tokens){ if(tok=="+"||tok=="-"||tok=="*"||tok=="/"){ int r=st.back(); st.pop_back(); int l=st.back(); st.pop_back(); if(tok=="+")st.push_back(l+r); else if(tok=="-")st.push_back(l-r); else if(tok=="*")st.push_back(l*r); else st.push_back(r==0?0:l/r); } else st.push_back(std::stoi(tok)); } return st.back(); } };',
      c: 'int evalRPN(char** tokens,int tokensSize){ int* st=(int*)malloc(sizeof(int)*tokensSize); int top=0; for(int i=0;i<tokensSize;i++){ const char* t=tokens[i]; if(t[0]==\'+\'&&t[1]==0){ int r=st[--top],l=st[--top]; st[top++]=l+r; } else if(t[0]==\'-\'&&t[1]==0){ int r=st[--top],l=st[--top]; st[top++]=l-r; } else if(t[0]==\'*\'&&t[1]==0){ int r=st[--top],l=st[--top]; st[top++]=l*r; } else if(t[0]==\'/\'&&t[1]==0){ int r=st[--top],l=st[--top]; st[top++]=(r==0?0:l/r); } else st[top++]=atoi(t); } return st[top-1]; }',
    },
  },
  {
    name: 'Remove Duplicate Letters',
    number: 255,
    cases: [
        ['"accbc"', '"abc"'],
        ['"c"', '"c"'],
        ['"zyx"', '"zyx"'],
        ['"a"', '"a"'],
        ['"cbacdcbc"', '"acdb"'],
        ['"acbaaac"', '"abc"'],
        ['"cacaaac"', '"ac"'],
        ['"aaa"', '"a"'],
        ['"aab"', '"ab"'],
        ['"abab"', '"ab"'],
        ['"bcacaaaa"', '"bac"'],
        ['"bcabc"', '"abc"'],
        ['"cbacbaacaaac"', '"abc"'],
        ['"ccb"', '"cb"'],
        ['"abcd"', '"abcd"'],
    ],
    // string(string) - monotonic stack with a last-seen map.
    refs: {
      javascript: 'function removeDuplicateLetters(s){const last={};for(let i=0;i<s.length;i++)last[s[i]]=i;const seen=new Set();const st=[];for(let i=0;i<s.length;i++){const c=s[i];if(seen.has(c))continue;while(st.length&&st[st.length-1]>c&&last[st[st.length-1]]>i){seen.delete(st.pop());}st.push(c);seen.add(c);}return st.join(\'\');}',
      python: 'class Solution:\n    def removeDuplicateLetters(self, s):\n        last = {}\n        for i, ch in enumerate(s):\n            last[ch] = i\n        seen = set()\n        st = []\n        for i, ch in enumerate(s):\n            if ch in seen:\n                continue\n            while st and st[-1] > ch and last[st[-1]] > i:\n                seen.discard(st.pop())\n            st.append(ch)\n            seen.add(ch)\n        return \'\'.join(st)',
      java: 'class Solution { public String removeDuplicateLetters(String s){ int[] last=new int[26]; java.util.Arrays.fill(last,-1); for(int i=0;i<s.length();i++)last[s.charAt(i)-\'a\']=i; boolean[] seen=new boolean[26]; StringBuilder st=new StringBuilder(); for(int i=0;i<s.length();i++){ char c=s.charAt(i); if(seen[c-\'a\'])continue; while(st.length()>0&&st.charAt(st.length()-1)>c&&last[st.charAt(st.length()-1)-\'a\']>i){ seen[st.charAt(st.length()-1)-\'a\']=false; st.deleteCharAt(st.length()-1); } st.append(c); seen[c-\'a\']=true; } return st.toString(); } }',
      cpp: 'class Solution { public: std::string removeDuplicateLetters(std::string s){ int last[26]; for(int i=0;i<26;i++)last[i]=-1; for(int i=0;i<(int)s.size();i++)last[s[i]-\'a\']=i; bool seen[26]={false}; std::string st; for(int i=0;i<(int)s.size();i++){ char c=s[i]; if(seen[c-\'a\'])continue; while(!st.empty()&&st.back()>c&&last[st.back()-\'a\']>i){ seen[st.back()-\'a\']=false; st.pop_back(); } st.push_back(c); seen[c-\'a\']=true; } return st; } };',
    },
    skip: { c: 'no string return printer in the C driver — the default branch prints an int cast of the pointer' },
  },
  {
    name: 'Shortest Path in an Unweighted Graph',
    number: 256,
    cases: [
        ['[[1,2],[0,2],[0,1],[],[],[]]\n2', '[1,1,0,-1,-1,-1]'],
        ['[[2],[3],[4],[]]\n0', '[0,-1,1,-1]'],
        ['[[1],[0,2],[1],[],[],[],[]]\n4', '[-1,-1,-1,-1,0,-1,-1]'],
        ['[[1],[0]]\n1', '[1,0]'],
        ['[[1],[0],[],[],[],[]]\n5', '[-1,-1,-1,-1,-1,0]'],
        ['[[],[],[]]\n2', '[-1,-1,0]'],
        ['[[2],[2],[0,1]]\n2', '[1,1,0]'],
        ['[[],[1]]\n1', '[-1,0]'],
        ['[[4],[],[],[],[0],[],[]]\n4', '[1,-1,-1,-1,0,-1,-1]'],
        ['[[],[],[],[]]\n0', '[0,-1,-1,-1]'],
        ['[[],[],[],[]]\n2', '[-1,-1,0,-1]'],
        ['[[1,2],[],[]]\n0', '[0,1,1]'],
        ['[[2,5],[],[0,5],[],[],[0,2],[]]\n5', '[1,-1,1,-1,-1,0,-1]'],
        ['[[],[],[]]\n0', '[0,-1,-1]'],
        ['[[]]\n0', '[0]'],
    ],
    // int[](int[][], int) - the stored graph references node 4 of 4; JS skips out-of-range neighbours silently and every ref mirrors that.
    refs: {
      javascript: 'function bfsDistances(graph,start){const dist=new Array(graph.length).fill(-1);if(start<0||start>=graph.length)return dist;dist[start]=0;const q=[start];let head=0;while(head<q.length){const node=q[head++];for(const nb of graph[node]){if(dist[nb]!==-1)continue;dist[nb]=dist[node]+1;q.push(nb);}}return dist;}',
      python: 'class Solution:\n    def bfsDistances(self, graph, start):\n        dist = [-1]*len(graph)\n        if start < 0 or start >= len(graph):\n            return dist\n        dist[start] = 0\n        q = [start]\n        head = 0\n        while head < len(q):\n            node = q[head]\n            head += 1\n            for nb in graph[node]:\n                if nb < 0 or nb >= len(dist):\n                    continue\n                if dist[nb] != -1:\n                    continue\n                dist[nb] = dist[node] + 1\n                q.append(nb)\n        return dist',
      java: 'class Solution { public int[] bfsDistances(int[][] graph,int start){ int[] dist=new int[graph.length]; java.util.Arrays.fill(dist,-1); if(start<0||start>=graph.length)return dist; dist[start]=0; int[] q=new int[graph.length+8]; int head=0,tail=0; q[tail++]=start; while(head<tail){ int node=q[head++]; for(int nb:graph[node]){ if(nb<0||nb>=dist.length)continue; if(dist[nb]!=-1)continue; dist[nb]=dist[node]+1; q[tail++]=nb; } } return dist; } }',
      cpp: 'class Solution { public: std::vector<int> bfsDistances(std::vector<std::vector<int>>& graph,int start){ int n=(int)graph.size(); std::vector<int> dist(n,-1); if(start<0||start>=n)return dist; dist[start]=0; std::vector<int> q; q.push_back(start); size_t head=0; while(head<q.size()){ int node=q[head++]; for(int nb:graph[node]){ if(nb<0||nb>=n)continue; if(dist[nb]!=-1)continue; dist[nb]=dist[node]+1; q.push_back(nb); } } return dist; } };',
    },
    skip: { c: 'no int[][] argument parser in the C driver — a nested JSON grid would be atoi()\'d into a single int' },
  },
  {
    name: 'Task Scheduler with Cooldown',
    number: 258,
    cases: [
        ['["A","A","A","B","B","C"]\n0', '6'],
        ['["A","A","A","B","A","B","A","A","A"]\n4', '31'],
        ['["A","A","C","B","C"]\n2', '5'],
        ['["B","D","D","D","A","C","C","A","D","B"]\n1', '10'],
        ['["A","A","A","A"]\n2', '10'],
        ['["A","A","A","B","B","C"]\n2', '7'],
        ['["A","A"]\n1', '3'],
        ['["B","A","B","B"]\n4', '11'],
        ['["A"]\n3', '1'],
        ['["A","B","C","D"]\n0', '4'],
        ['["A","A","A","A","A","A","A","A","A","A"]\n4', '46'],
        ['["A","A","A","A","A","A","A","A","A"]\n1', '17'],
        ['["B","B","A","B","A","B","B","B"]\n2', '16'],
        ['["A","A","A","B","B","C","B","B"]\n1', '8'],
        ['["A","A","A"]\n1', '5'],
    ],
    // int(char[], int) - char[] is classified unknown by detectKind, so js+py only until the driver learns to parse it.
    refs: {
      javascript: 'function leastInterval(tasks,n){if(tasks.length===0)return 0;const counts={};for(const t of tasks)counts[t]=(counts[t]||0)+1;let maxCount=0;for(const c of Object.values(counts))if(c>maxCount)maxCount=c;let maxKinds=0;for(const c of Object.values(counts))if(c===maxCount)maxKinds++;const frame=(maxCount-1)*(n+1)+maxKinds;return Math.max(tasks.length,frame);}',
      python: 'class Solution:\n    def leastInterval(self, tasks, n):\n        if not tasks:\n            return 0\n        counts = {}\n        for t in tasks:\n            counts[t] = counts.get(t, 0) + 1\n        max_count = max(counts.values())\n        max_kinds = sum(1 for c in counts.values() if c == max_count)\n        frame = (max_count - 1) * (n + 1) + max_kinds\n        return max(len(tasks), frame)',
    },
    skip: { java: 'char[] is classified unknown by detectKind — the generated driver has no parse path for it', cpp: 'char[] is classified unknown by detectKind — the generated driver has no parse path for it', c: 'char[] is classified unknown by detectKind — the C driver would atoi() the JSON array' },
  },
  {
    name: 'Subarray Sum Equals K',
    number: 265,
    cases: [
        ['[1]\n1', '1'],
        ['[2,-3,-3,3,-3,3,-1]\n4', '0'],
        ['[1,-1,0]\n1', '1'],
        ['[-1,2,-1,1,-2]\n1', '4'],
        ['[3,-2,1,3,1,2,-2,-2]\n6', '3'],
        ['[3]\n6', '0'],
        ['[1,1,0,-2,1,3,3,3,0,-2,-1,1]\n1', '8'],
        ['[2,-3]\n4', '0'],
        ['[2]\n0', '0'],
        ['[-2]\n0', '0'],
        ['[1,-1,0]\n0', '3'],
        ['[1,2,3]\n3', '2'],
        ['[1,1,1]\n2', '2'],
        ['[-2,0,2,2,-1,0]\n-2', '2'],
        ['[3]\n3', '1'],
    ],
    // int(int[], int) - prefix sum with a frequency map.
    refs: {
      javascript: 'function subarraySum(nums,k){const freq={0:1};let run=0,count=0;for(const v of nums){run+=v;const want=run-k;if(freq[want]!==undefined)count+=freq[want];freq[run]=(freq[run]||0)+1;}return count;}',
      python: 'class Solution:\n    def subarraySum(self, nums, k):\n        freq = {0: 1}\n        run = count = 0\n        for v in nums:\n            run += v\n            count += freq.get(run - k, 0)\n            freq[run] = freq.get(run, 0) + 1\n        return count',
      java: 'class Solution { public int subarraySum(int[] nums,int k){ java.util.HashMap<Integer,Integer> freq=new java.util.HashMap<>(); freq.put(0,1); int run=0,count=0; for(int v:nums){ run+=v; Integer w=freq.get(run-k); if(w!=null)count+=w; freq.put(run,(freq.get(run)==null?0:freq.get(run))+1); } return count; } }',
      cpp: 'class Solution { public: int subarraySum(std::vector<int>& nums,int k){ std::unordered_map<int,int> freq; freq[0]=1; int run=0,count=0; for(int v:nums){ run+=v; auto it=freq.find(run-k); if(it!=freq.end())count+=it->second; freq[run]++; } return count; } };',
      c: 'int subarraySum(int* nums,int numsSize,int k){ int count=0; for(int i=0;i<numsSize;i++){ int run=0; for(int j=i;j<numsSize;j++){ run+=nums[j]; if(run==k)count++; } } return count; }',
    },
  },
  {
    name: 'Intersection of Two Arrays',
    number: 267,
    cases: [
        ['[1,2,3]\n[4,5,6]', '[]'],
        ['[5]\n[5]', '[5]'],
        ['[]\n[4,2,4,2]', '[]'],
        ['[]\n[1]', '[]'],
        ['[]\n[6,4,2,5,4,3,6,5,5,1]', '[]'],
        ['[3,6,4]\n[4]', '[4]'],
        ['[4,9,5]\n[9,4,9,8,4]', '[4,9]'],
        ['[2,3,5,2,1,6,2,1,2]\n[3,4,3,6,2,4,3,5]', '[2,3,5,6]'],
        ['[1,1,2,1,6,4,2,3,3,6]\n[]', '[]'],
        ['[2]\n[6,6,5,3,2,3,1,6,3]', '[2]'],
        ['[3,1,5,3,2,2]\n[3,3]', '[3]'],
        ['[2,2,2,2,4,5,1]\n[2,1]', '[1,2]'],
        ['[1,2,2,1]\n[2,2]', '[2]'],
        ['[4,3,1,4,6,6]\n[3,3,1,1]', '[1,3]'],
        ['[1,1,1]\n[1,1]', '[1]'],
    ],
    // int[](int[], int[]) - unique intersection, ascending.
    refs: {
      javascript: 'function arrayIntersection(a,b){const inA=new Set(a);const seen=new Set();const out=[];for(const v of b){if(inA.has(v)&&!seen.has(v)){seen.add(v);out.push(v);}}out.sort((x,y)=>x-y);return out;}',
      python: 'class Solution:\n    def arrayIntersection(self, a, b):\n        in_a = set(a)\n        out = []\n        seen = set()\n        for v in b:\n            if v in in_a and v not in seen:\n                seen.add(v)\n                out.append(v)\n        out.sort()\n        return out',
      java: 'class Solution { public int[] arrayIntersection(int[] a,int[] b){ java.util.TreeSet<Integer> t=new java.util.TreeSet<>(); for(int v:b){ t.add(v); } java.util.HashSet<Integer> sa=new java.util.HashSet<>(); for(int v:a){ sa.add(v); } java.util.ArrayList<Integer> r=new java.util.ArrayList<>(); for(int v:t){ if(sa.contains(v))r.add(v); } int[] out=new int[r.size()]; for(int i=0;i<out.length;i++)out[i]=r.get(i); return out; } }',
      cpp: 'class Solution { public: std::vector<int> arrayIntersection(std::vector<int>& a,std::vector<int>& b){ std::unordered_map<int,int> inA; for(int v:a)inA[v]=1; std::unordered_map<int,int> seen; std::vector<int> out; for(int v:b){ if(inA.count(v)&&!seen.count(v)){ seen[v]=1; out.push_back(v); } } for(size_t i=0;i<out.size();i++)for(size_t j=i+1;j<out.size();j++)if(out[j]<out[i]){int t=out[i];out[i]=out[j];out[j]=t;} return out; } };',
      c: 'int* arrayIntersection(int* a,int aSize,int* b,int bSize,int* returnSize){ int* out=(int*)malloc(sizeof(int)*aSize); int m=0; for(int i=0;i<bSize;i++){ int v=b[i],inA=0,added=0; for(int x=0;x<aSize;x++)if(a[x]==v)inA=1; for(int x=0;x<m;x++)if(out[x]==v)added=1; if(inA&&!added)out[m++]=v; } for(int i=0;i<m;i++)for(int j=i+1;j<m;j++)if(out[j]<out[i]){int t=out[i];out[i]=out[j];out[j]=t;} *returnSize=m; return out; }',
    },
  },
  {
    name: 'Design a Hash Set',
    number: 268,
    cases: [
        ['"remove:4|add:4,5"', '[null,null]'],
        ['"contains:4|remove:2|contains:3|add:1,5|contains:5"', '[false,null,false,null,true]'],
        ['"remove:3"', '[null]'],
        ['""', '[]'],
        ['"contains:5|remove:5|contains:3|remove:1|remove:4|contains:3|contains:2|contains:1"', '[false,null,false,null,null,false,false,false]'],
        ['"contains:3|add:4,5|contains:2|add:2,1,2|contains:2|remove:1|contains:5|contains:4"', '[false,null,false,null,true,null,true,true]'],
        ['"add:1,2|contains:1|remove:2|contains:2"', '[null,true,null,false]'],
        ['"add:1,1,1|contains:1"', '[null,true]'],
        ['"add:7|contains:7"', '[null,true]'],
        ['"contains:5"', '[false]'],
        ['"remove:3|remove:5|remove:5"', '[null,null,null]'],
        ['"contains:3|add:2,4|remove:5|remove:4|add:4,5|contains:3|contains:4"', '[false,null,null,null,null,false,true]'],
        ['"add:1|contains:1|contains:2|remove:1|contains:1"', '[null,true,false,null,false]'],
        ['"contains:3|contains:2|add:1|add:2"', '[false,false,null,null]'],
        ['"remove:5|contains:2|remove:5"', '[null,false,null]'],
    ],
    // boolean[](string) - output mixes null with booleans; boolean[] cannot express that, so js+py only.
    refs: {
      javascript: 'function runHashSet(s){const set=new Set();const out=[];for(const part of String(s).split(\'|\')){if(part.length===0)continue;const at=part.indexOf(\':\');const name=at===-1?part:part.slice(0,at);const raw=at===-1?\'\':part.slice(at+1);const keys=raw.length?raw.split(\',\').map(Number):[];if(name===\'add\'){for(const k of keys)set.add(k);out.push(null);}else if(name===\'remove\'){for(const k of keys)set.delete(k);out.push(null);}else if(name===\'contains\'){out.push(keys.length?set.has(keys[0]):false);}}return out;}',
      python: 'class Solution:\n    def runHashSet(self, s):\n        st = set()\n        out = []\n        for part in str(s).split(\'|\'):\n            if len(part) == 0:\n                continue\n            at = part.find(\':\')\n            name = part if at == -1 else part[:at]\n            raw = \'\' if at == -1 else part[at+1:]\n            keys = [int(v) for v in raw.split(\',\')] if raw else []\n            if name == \'add\':\n                for k in keys: st.add(k)\n                out.append(None)\n            elif name == \'remove\':\n                for k in keys: st.discard(k)\n                out.append(None)\n            elif name == \'contains\':\n                out.append((keys[0] in st) if keys else False)\n        return out',
    },
    skip: { java: 'boolean[] cannot represent the null entries this output requires', cpp: 'std::vector<bool> cannot represent the null entries this output requires', c: 'boolean[] cannot hold null and the C driver has no boolean[] return printer' },
  },
  {
    name: 'Kth Smallest from a Stream',
    number: 271,
    cases: [
        ['1\n[4,4]', '[4,4]'],
        ['2\n[8,2,1]', '[-1,8,2]'],
        ['3\n[1]', '[-1]'],
        ['2\n[4,2,3,3,4,1]', '[-1,4,3,3,3,2]'],
        ['2\n[2,2,2,6,1,4]', '[-1,2,2,2,2,2]'],
        ['2\n[2,5,1]', '[-1,5,2]'],
        ['4\n[9,8,7,6,5]', '[-1,-1,-1,9,8]'],
        ['1\n[7,7,3,7,4,5]', '[7,7,3,3,3,3]'],
        ['2\n[1,2]', '[-1,2]'],
        ['3\n[4,5,8,2]', '[-1,-1,8,5]'],
        ['2\n[3,2]', '[-1,3]'],
        ['4\n[2,4,2,2]', '[-1,-1,-1,4]'],
        ['1\n[5,3,7]', '[5,3,3]'],
        ['1\n[5,6,3,1,5,8]', '[5,5,3,1,1,1]'],
        ['4\n[7,3,8,5,7,4]', '[-1,-1,-1,8,7,7]'],
    ],
    // int[](int, int[]) - scalar BEFORE the array, so C line indexing gets a second workout; -1 until k values have arrived.
    refs: {
      javascript: 'function kthSmallestStream(k,values){const out=[];for(let i=0;i<values.length;i++){if(i+1<k){out.push(-1);continue;}const s=values.slice(0,i+1).sort((x,y)=>x-y);out.push(s[k-1]);}return out;}',
      python: 'class Solution:\n    def kthSmallestStream(self, k, values):\n        out = []\n        for i in range(len(values)):\n            if i + 1 < k:\n                out.append(-1)\n            else:\n                out.append(sorted(values[:i+1])[k-1])\n        return out',
      java: 'class Solution { public int[] kthSmallestStream(int k,int[] values){ int[] out=new int[values.length]; for(int i=0;i<values.length;i++){ if(i+1<k){ out[i]=-1; } else { int[] s=new int[i+1]; System.arraycopy(values,0,s,0,i+1); java.util.Arrays.sort(s); out[i]=s[k-1]; } } return out; } }',
      cpp: 'class Solution { public: std::vector<int> kthSmallestStream(int k,std::vector<int>& values){ std::vector<int> out; for(size_t i=0;i<values.size();i++){ if((int)i+1<k){ out.push_back(-1); continue; } std::vector<int> s(values.begin(),values.begin()+i+1); for(size_t a=0;a<s.size();a++)for(size_t b=a+1;b<s.size();b++)if(s[b]<s[a]){int t=s[a];s[a]=s[b];s[b]=t;} out.push_back(s[k-1]); } return out; } };',
      c: 'int* kthSmallestStream(int k,int* values,int valuesSize,int* returnSize){ int* out=(int*)malloc(sizeof(int)*valuesSize); for(int i=0;i<valuesSize;i++){ if(i+1<k){ out[i]=-1; } else { int* s=(int*)malloc(sizeof(int)*(i+1)); for(int x=0;x<=i;x++)s[x]=values[x]; for(int a=0;a<=i;a++)for(int b=a+1;b<=i;b++)if(s[b]<s[a]){int t=s[a];s[a]=s[b];s[b]=t;} out[i]=s[k-1]; free(s); } } *returnSize=valuesSize; return out; }',
    },
  },
  {
    name: 'Median from a Running Sequence',
    number: 274,
    cases: [
        ['[4,10]', '[4,7]'],
        ['[1]', '[1]'],
        ['[2,4]', '[2,3]'],
        ['[4,6,5,1,9,9]', '[4,5,5,4.5,5,5.5]'],
        ['[1,2,3]', '[1,1.5,2]'],
        ['[6]', '[6]'],
        ['[7,1,5,10,7,2,7]', '[7,4,5,6,7,6,7]'],
        ['[6,4,2,5,8]', '[6,5,4,4.5,5]'],
        ['[7,1,2]', '[7,4,2]'],
        ['[7]', '[7]'],
        ['[3,1,2]', '[3,2,2]'],
        ['[5]', '[5]'],
        ['[4,7,3,1,6,4,7]', '[4,5.5,4,3.5,4,4,4]'],
        ['[5,3,1,1,5,10,9]', '[5,4,3,2,3,4,5]'],
        ['[3,8,6,9,2,10,5,7,7]', '[3,5.5,6,7,6,7,6,6.5,7]'],
    ],
    // double[](int[]) - fractional medians; the python ref emits ints where integral so compact json stays exact.
    refs: {
      javascript: 'function medianStream(values){const out=[];for(let i=0;i<values.length;i++){const s=values.slice(0,i+1).sort((a,b)=>a-b);const L=s.length;out.push(L%2===1?s[(L-1)/2]:(s[L/2-1]+s[L/2])/2);}return out;}',
      python: 'class Solution:\n    def medianStream(self, values):\n        out = []\n        for i in range(len(values)):\n            s = sorted(values[:i+1])\n            L = len(s)\n            v = s[(L-1)//2] if L % 2 == 1 else (s[L//2-1] + s[L//2]) / 2\n            out.append(int(v) if float(v).is_integer() else v)\n        return out',
      java: 'class Solution { public double[] medianStream(int[] values){ double[] out=new double[values.length]; for(int i=0;i<values.length;i++){ int[] s=new int[i+1]; java.lang.System.arraycopy(values,0,s,0,i+1); java.util.Arrays.sort(s); int L=s.length; out[i]=(L%2==1)?s[(L-1)/2]:(s[L/2-1]+s[L/2])/2.0; } return out; } }',
      cpp: 'class Solution { public: std::vector<double> medianStream(std::vector<int>& values){ std::vector<double> out; for(size_t i=0;i<values.size();i++){ std::vector<int> s(values.begin(),values.begin()+i+1); for(size_t a=0;a<s.size();a++)for(size_t b=a+1;b<s.size();b++)if(s[b]<s[a]){int t=s[a];s[a]=s[b];s[b]=t;} int L=(int)s.size(); out.push_back((L%2==1)?(double)s[(L-1)/2]:(double)(s[L/2-1]+s[L/2])/2.0); } return out; } };',
    },
    skip: { c: 'no double[] return printer in the C driver — the default branch prints an int cast of the pointer' },
  },
  {
    name: 'Unique Paths in a Grid',
    number: 282,
    cases: [
        ['[[0,1],[1,0]]\n2\n2', '0'],
        ['[[0,1],[0,0]]\n2\n2', '1'],
        ['[[0,0,0],[0,1,0],[0,0,0]]\n3\n3', '2'],
        ['[[0,0,0,0],[0,0,0,1],[0,0,1,1],[0,1,0,1]]\n4\n4', '0'],
        ['[[0]]\n1\n1', '1'],
        ['[[1]]\n1\n1', '0'],
        ['[[1,0,1],[0,0,1],[0,0,1]]\n3\n3', '0'],
        ['[[0,0,1]]\n1\n3', '0'],
        ['[[0,0],[0,0]]\n2\n2', '2'],
        ['[[0,0,0,1]]\n1\n4', '0'],
        ['[[0,0],[0,1]]\n2\n2', '0'],
        ['[[0,0,0],[1,1,0],[0,0,0]]\n3\n3', '1'],
        ['[[0,0,1],[0,1,0]]\n2\n3', '0'],
        ['[[1,0],[1,0],[1,1],[1,0]]\n4\n2', '0'],
        ['[[0],[0],[0],[0]]\n4\n1', '1'],
    ],
    // int(int[][], int, int) - DP over a blocker grid with scalar dimensions.
    refs: {
      javascript: 'function countUniquePaths(grid,m,n){const dp=new Array(n).fill(1);for(let j=0;j<n;j++){if(grid[0][j]===1)dp[j]=0;}for(let i=1;i<m;i++){for(let j=0;j<n;j++){if(grid[i][j]===1)dp[j]=0;else dp[j]=dp[j]+(j>0?dp[j-1]:0);}}return dp[n-1];}',
      python: 'class Solution:\n    def countUniquePaths(self, grid, m, n):\n        dp = [1]*n\n        for j in range(n):\n            if grid[0][j] == 1:\n                dp[j] = 0\n        for i in range(1, m):\n            for j in range(n):\n                if grid[i][j] == 1:\n                    dp[j] = 0\n                else:\n                    dp[j] = dp[j] + (dp[j-1] if j > 0 else 0)\n        return dp[n-1]',
      java: 'class Solution { public int countUniquePaths(int[][] grid,int m,int n){ int[] dp=new int[n]; java.util.Arrays.fill(dp,1); for(int j=0;j<n;j++){ if(grid[0][j]==1)dp[j]=0; } for(int i=1;i<m;i++){ for(int j=0;j<n;j++){ if(grid[i][j]==1)dp[j]=0; else dp[j]=dp[j]+(j>0?dp[j-1]:0); } } return dp[n-1]; } }',
      cpp: 'class Solution { public: int countUniquePaths(std::vector<std::vector<int>>& grid,int m,int n){ std::vector<int> dp(n,1); for(int j=0;j<n;j++){ if(grid[0][j]==1)dp[j]=0; } for(int i=1;i<m;i++){ for(int j=0;j<n;j++){ if(grid[i][j]==1)dp[j]=0; else dp[j]=dp[j]+(j>0?dp[j-1]:0); } } return dp[n-1]; } };',
    },
    skip: { c: 'no int[][] argument parser in the C driver — a nested JSON grid would be atoi()\'d into a single int' },
  },
  {
    name: 'Edit Distance Between Two Strings',
    number: 283,
    cases: [
        ['""\n"cb"', '2'],
        ['"aabc"\n"cabaaa"', '4'],
        ['"same"\n"same"', '0'],
        ['""\n"abc"', '3'],
        ['"ca"\n"baaccbc"', '6'],
        ['"bb"\n"cbac"', '3'],
        ['"abc"\n"abc"', '0'],
        ['"baccc"\n"abbbbc"', '4'],
        ['"intention"\n"execution"', '5'],
        ['"horse"\n"ros"', '3'],
        ['"bccbbbcc"\n"bcbb"', '4'],
        ['"a"\n"b"', '1'],
        ['"ab"\n"abccaa"', '4'],
        ['"bbbb"\n"bbcba"', '2'],
        ['"bacacc"\n"babbcaab"', '4'],
    ],
    // int(string, string) - Levenshtein on a rolling row.
    refs: {
      javascript: 'function editDistance(a,b){const n=b.length;let dp=new Array(n+1);for(let j=0;j<=n;j++)dp[j]=j;for(let i=1;i<=a.length;i++){const next=new Array(n+1);next[0]=i;for(let j=1;j<=n;j++){if(a[i-1]===b[j-1])next[j]=dp[j-1];else next[j]=1+Math.min(dp[j-1],dp[j],next[j-1]);}dp=next;}return dp[n];}',
      python: 'class Solution:\n    def editDistance(self, a, b):\n        n = len(b)\n        dp = list(range(n+1))\n        for i in range(1, len(a)+1):\n            nxt = [0]*(n+1)\n            nxt[0] = i\n            for j in range(1, n+1):\n                if a[i-1] == b[j-1]:\n                    nxt[j] = dp[j-1]\n                else:\n                    nxt[j] = 1 + min(dp[j-1], dp[j], nxt[j-1])\n            dp = nxt\n        return dp[n]',
      java: 'class Solution { public int editDistance(String a,String b){ int n=b.length(); int[] dp=new int[n+1]; for(int j=0;j<=n;j++)dp[j]=j; for(int i=1;i<=a.length();i++){ int[] next=new int[n+1]; next[0]=i; for(int j=1;j<=n;j++){ if(a.charAt(i-1)==b.charAt(j-1))next[j]=dp[j-1]; else next[j]=1+Math.min(dp[j-1],Math.min(dp[j],next[j-1])); } dp=next; } return dp[n]; } }',
      cpp: 'class Solution { public: int editDistance(std::string a,std::string b){ int n=(int)b.size(); std::vector<int> dp(n+1); for(int j=0;j<=n;j++)dp[j]=j; for(int i=1;i<=(int)a.size();i++){ std::vector<int> next(n+1); next[0]=i; for(int j=1;j<=n;j++){ if(a[i-1]==b[j-1])next[j]=dp[j-1]; else { int m=dp[j-1]<dp[j]?dp[j-1]:dp[j]; if(next[j-1]<m)m=next[j-1]; next[j]=1+m; } } dp=next; } return dp[n]; } };',
      c: 'int editDistance(char* a,char* b){ int na=(int)strlen(a),nb=(int)strlen(b); int* dp=(int*)malloc(sizeof(int)*(nb+1)); int* next=(int*)malloc(sizeof(int)*(nb+1)); for(int j=0;j<=nb;j++)dp[j]=j; for(int i=1;i<=na;i++){ next[0]=i; for(int j=1;j<=nb;j++){ if(a[i-1]==b[j-1])next[j]=dp[j-1]; else { int m=dp[j-1]<dp[j]?dp[j-1]:dp[j]; if(next[j-1]<m)m=next[j-1]; next[j]=1+m; } } int* t=dp;dp=next;next=t; } int r=dp[nb]; free(dp); free(next); return r; }',
    },
  },
  {
    name: 'Permutations',
    number: 302,
    cases: [
        ['[2,2]', '[[2,2],[2,2]]'],
        ['[1]', '[[1]]'],
        ['[1,2,3,4]', '[[1,2,3,4],[1,2,4,3],[1,3,2,4],[1,3,4,2],[1,4,2,3],[1,4,3,2],[2,1,3,4],[2,1,4,3],[2,3,1,4],[2,3,4,1],[2,4,1,3],[2,4,3,1],[3,1,2,4],[3,1,4,2],[3,2,1,4],[3,2,4,1],[3,4,1,2],[3,4,2,1],[4,1,2,3],[4,1,3,2],[4,2,1,3],[4,2,3,1],[4,3,1,2],[4,3,2,1]]'],
        ['[1,2,3]', '[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]'],
        ['[-1,0,3]', '[[-1,0,3],[-1,3,0],[0,-1,3],[0,3,-1],[3,-1,0],[3,0,-1]]'],
        ['[-1,0,1]', '[[-1,0,1],[-1,1,0],[0,-1,1],[0,1,-1],[1,-1,0],[1,0,-1]]'],
        ['[2,-1,3]', '[[2,-1,3],[2,3,-1],[-1,2,3],[-1,3,2],[3,2,-1],[3,-1,2]]'],
        ['[0,1]', '[[0,1],[1,0]]'],
        ['[2]', '[[2]]'],
        ['[2,0]', '[[2,0],[0,2]]'],
        ['[-4]', '[[-4]]'],
        ['[4,-2,2,1]', '[[4,-2,2,1],[4,-2,1,2],[4,2,-2,1],[4,2,1,-2],[4,1,-2,2],[4,1,2,-2],[-2,4,2,1],[-2,4,1,2],[-2,2,4,1],[-2,2,1,4],[-2,1,4,2],[-2,1,2,4],[2,4,-2,1],[2,4,1,-2],[2,-2,4,1],[2,-2,1,4],[2,1,4,-2],[2,1,-2,4],[1,4,-2,2],[1,4,2,-2],[1,-2,4,2],[1,-2,2,4],[1,2,4,-2],[1,2,-2,4]]'],
        ['[4,1,-1,1]', '[[4,1,-1,1],[4,1,1,-1],[4,-1,1,1],[4,-1,1,1],[4,1,1,-1],[4,1,-1,1],[1,4,-1,1],[1,4,1,-1],[1,-1,4,1],[1,-1,1,4],[1,1,4,-1],[1,1,-1,4],[-1,4,1,1],[-1,4,1,1],[-1,1,4,1],[-1,1,1,4],[-1,1,4,1],[-1,1,1,4],[1,4,1,-1],[1,4,-1,1],[1,1,4,-1],[1,1,-1,4],[1,-1,4,1],[1,-1,1,4]]'],
        ['[-2,-2,4]', '[[-2,-2,4],[-2,4,-2],[-2,-2,4],[-2,4,-2],[4,-2,-2],[4,-2,-2]]'],
        ['[2,4]', '[[2,4],[4,2]]'],
    ],
    // int[][](int[]) - 2D return; DFS emission order must match byte for byte.
    refs: {
      javascript: 'function permute(nums){const n=nums.length;const out=[];const used=new Array(n).fill(false);const cur=[];function pick(){if(cur.length===n){out.push(cur.slice());return;}for(let i=0;i<n;i++){if(used[i])continue;used[i]=true;cur.push(nums[i]);pick();cur.pop();used[i]=false;}}pick();return out;}',
      python: 'class Solution:\n    def permute(self, nums):\n        n = len(nums)\n        out = []\n        used = [False]*n\n        cur = []\n        def pick():\n            if len(cur) == n:\n                out.append(cur[:])\n                return\n            for i in range(n):\n                if used[i]: continue\n                used[i] = True\n                cur.append(nums[i])\n                pick()\n                cur.pop()\n                used[i] = False\n        pick()\n        return out',
      java: 'class Solution { public int[][] permute(int[] nums){ final int n=nums.length; final java.util.ArrayList<int[]> out=new java.util.ArrayList<>(); final boolean[] used=new boolean[n]; final int[] cur=new int[n]; final int[] pos={0}; class P { void run(){ if(pos[0]==n){ int[] c=new int[n]; java.lang.System.arraycopy(cur,0,c,0,n); out.add(c); return; } for(int i=0;i<n;i++){ if(used[i])continue; used[i]=true; cur[pos[0]]=nums[i]; pos[0]++; run(); pos[0]--; used[i]=false; } } } new P().run(); int[][] res=new int[out.size()][]; for(int i=0;i<res.length;i++)res[i]=out.get(i); return res; } }',
      cpp: 'class Solution { public: std::vector<std::vector<int>> permute(std::vector<int>& nums){ std::vector<std::vector<int>> out; std::vector<int> cur; std::vector<bool> used(nums.size(),false); Pick(nums,used,cur,out); return out; } void Pick(std::vector<int>& nums,std::vector<bool>& used,std::vector<int>& cur,std::vector<std::vector<int>>& out){ int n=(int)nums.size(); if((int)cur.size()==n){ out.push_back(cur); return; } for(int i=0;i<n;i++){ if(used[i])continue; used[i]=true; cur.push_back(nums[i]); Pick(nums,used,cur,out); cur.pop_back(); used[i]=false; } } };',
    },
    skip: { c: 'no int[][] return printer in the C driver — the default branch prints an int cast of the pointer' },
  },
  {
    name: 'Word Search in Grid',
    number: 304,
    cases: [
        ['[["A"]]\n"CCC"', 'false'],
        ['[["A","B"],["C","D"]]\n"BA"', 'true'],
        ['[["A","B"]]\n"AB"', 'true'],
        ['[["A","B"],["C","D"]]\n"AD"', 'false'],
        ['[["C","A","B"]]\n"AA"', 'false'],
        ['[["B","C","A"],["B","B","B"]]\n"BCC"', 'false'],
        ['[["B","B"],["B","C"],["C","C"]]\n"ABC"', 'false'],
        ['[["C","B","A"],["A","C","B"]]\n"A"', 'true'],
        ['[["B","B","B"],["B","B","B"]]\n"AB"', 'false'],
        ['[["A","B"],["C","D"]]\n"DX"', 'false'],
        ['[["A","A","A"],["B","C","B"]]\n"BBC"', 'false'],
        ['[["C","C"]]\n"BB"', 'false'],
        ['[["A","B"],["C","D"]]\n"AB"', 'true'],
        ['[["A"]]\n"A"', 'true'],
        ['[["B","B","A"]]\n"BBA"', 'true'],
    ],
    // bool(char[][], string) - rows only, forward then reversed, exactly as the bank defines it.
    refs: {
      javascript: 'function searchWord(board,word){const m=board.length,n=board[0].length,len=word.length;const rev=word.split(\'\').reverse().join(\'\');for(const cand of [word,rev]){for(let i=0;i<m;i++){for(let j=0;j+len<=n;j++){let k=0;while(k<len&&board[i][j+k]===cand[k])k++;if(k===len)return true;}}}return false;}',
      python: 'class Solution:\n    def searchWord(self, board, word):\n        m, n = len(board), len(board[0])\n        L = len(word)\n        rev = word[::-1]\n        for cand in (word, rev):\n            for i in range(m):\n                for j in range(n - L + 1):\n                    k = 0\n                    while k < L and board[i][j+k] == cand[k]:\n                        k += 1\n                    if k == L:\n                        return True\n        return False',
    },
    skip: { java: 'char[][] is classified int_array_2d by detectKind — the driver parses an int grid and cannot construct a char[][]', cpp: 'char[][] is classified int_array_2d by detectKind — the driver parses an int grid and cannot construct a char[][]', c: 'char[][] is classified int_array_2d and the C driver has no nested-grid parser' },
  },
  {
    name: 'Number of Set Bits',
    number: 305,
    cases: [
        ['128', '1'],
        ['268675', '7'],
        ['11', '3'],
        ['802774', '13'],
        ['255', '8'],
        ['76940', '7'],
        ['531033', '8'],
        ['1', '1'],
        ['19073', '5'],
        ['253281', '11'],
        ['4294967295', '32'],
        ['461697', '8'],
        ['582055', '10'],
        ['562196', '6'],
        ['0', '0'],
    ],
    // int(int) - popcount via clear-lowest-set-bit.
    refs: {
      javascript: 'function countSetBits(n){let c=0,v=n;while(v!==0){v=v&(v-1);c++;}return c;}',
      python: 'class Solution:\n    def countSetBits(self, n):\n        return bin(n).count(\'1\')',
      java: 'class Solution { public int countSetBits(int n){ return Integer.bitCount(n); } }',
      cpp: 'class Solution { public: int countSetBits(int n){ return __builtin_popcount((unsigned)n); } };',
      c: 'int countSetBits(int n){ return __builtin_popcount((unsigned)n); }',
    },
  },
  {
    name: 'Power of Two Check',
    number: 308,
    cases: [
        ['138', 'false'],
        ['-245', 'false'],
        ['16', 'true'],
        ['1024', 'true'],
        ['700', 'false'],
        ['729', 'false'],
        ['963', 'false'],
        ['551', 'false'],
        ['1', 'true'],
        ['3', 'false'],
        ['0', 'false'],
        ['-962', 'false'],
        ['-16', 'false'],
        ['695', 'false'],
        ['309', 'false'],
    ],
    // bool(int) - first boolean scalar return in the matrix.
    refs: {
      javascript: 'function isPowerOfTwo(n){if(n<=0)return false;return(n&(n-1))===0;}',
      python: 'class Solution:\n    def isPowerOfTwo(self, n):\n        if n <= 0:\n            return False\n        return (n & (n-1)) == 0',
      java: 'class Solution { public boolean isPowerOfTwo(int n){ if(n<=0)return false; return (n&(n-1))==0; } }',
      cpp: 'class Solution { public: bool isPowerOfTwo(int n){ if(n<=0)return false; return (n&(n-1))==0; } };',
      c: 'bool isPowerOfTwo(int n){ if(n<=0)return false; return (n&(n-1))==0; }',
    },
  },
  {
    name: 'Number of Islands',
    number: 315,
    cases: [
        ['[[1,0],[0,1]]', '2'],
        ['[[1,0,1],[0,0,1]]', '2'],
        ['[[1,1,0,1],[0,0,0,0],[1,1,0,0]]', '3'],
        ['[[1,0],[1,0],[0,0],[0,0]]', '1'],
        ['[[1,0,0,0,1]]', '2'],
        ['[[1,1,0,1,0]]', '2'],
        ['[[1,0,0],[1,1,0],[1,1,0],[0,0,0]]', '1'],
        ['[[1]]', '1'],
        ['[[1,1],[1,0],[1,0],[0,0]]', '1'],
        ['[[1,1,0],[1,1,0],[0,0,1]]', '2'],
        ['[[1,0],[0,1],[0,0],[1,0]]', '3'],
        ['[[1,1,1]]', '1'],
        ['[[0,0],[0,0]]', '0'],
        ['[[0,0,0,1,1],[0,0,0,0,0],[0,0,0,0,0],[0,0,1,1,1],[0,0,0,1,0]]', '2'],
        ['[[0,0,0,0,1],[0,0,0,1,1],[1,1,0,0,1],[0,1,0,1,1],[1,1,0,0,0]]', '2'],
    ],
    // int(int[][]) - 2D grid flood fill; C has no nested-grid parser.
    refs: {
      javascript: 'function numIslands(grid){if(!grid.length||!grid[0].length)return 0;const R=grid.length,C=grid[0].length;const seen=grid.map(r=>r.map(()=>false));let count=0;for(let r=0;r<R;r++)for(let c=0;c<C;c++){if(grid[r][c]===1&&!seen[r][c]){count++;const st=[[r,c]];seen[r][c]=true;while(st.length){const[cr,cc]=st.pop();const nb=[[cr+1,cc],[cr-1,cc],[cr,cc+1],[cr,cc-1]];for(const[nr,nc]of nb){if(nr<0||nr>=R||nc<0||nc>=C)continue;if(seen[nr][nc])continue;if(grid[nr][nc]!==1)continue;seen[nr][nc]=true;st.push([nr,nc]);}}}}return count;}',
      python: 'class Solution:\n    def numIslands(self, grid):\n        if not grid or not grid[0]:\n            return 0\n        R, C = len(grid), len(grid[0])\n        seen = [[False]*C for _ in range(R)]\n        count = 0\n        for r in range(R):\n            for c in range(C):\n                if grid[r][c] == 1 and not seen[r][c]:\n                    count += 1\n                    seen[r][c] = True\n                    st = [(r, c)]\n                    while st:\n                        cr, cc = st.pop()\n                        for nr, nc in ((cr+1,cc),(cr-1,cc),(cr,cc+1),(cr,cc-1)):\n                            if nr<0 or nr>=R or nc<0 or nc>=C: continue\n                            if seen[nr][nc] or grid[nr][nc] != 1: continue\n                            seen[nr][nc] = True\n                            st.append((nr, nc))\n        return count',
      java: 'class Solution { public int numIslands(int[][] grid){ if(grid.length==0||grid[0].length==0)return 0; int R=grid.length,C=grid[0].length; boolean[][] seen=new boolean[R][C]; int count=0; for(int r=0;r<R;r++)for(int c=0;c<C;c++){ if(grid[r][c]==1&&!seen[r][c]){ count++; seen[r][c]=true; java.util.ArrayDeque<int[]> st=new java.util.ArrayDeque<>(); st.push(new int[]{r,c}); while(!st.isEmpty()){ int[] cur=st.pop(); int cr=cur[0],cc=cur[1]; int[][] nb={{cr+1,cc},{cr-1,cc},{cr,cc+1},{cr,cc-1}}; for(int[] p:nb){ int nr=p[0],nc=p[1]; if(nr<0||nr>=R||nc<0||nc>=C)continue; if(seen[nr][nc])continue; if(grid[nr][nc]!=1)continue; seen[nr][nc]=true; st.push(p); } } } } return count; } }',
      cpp: 'class Solution { public: int numIslands(std::vector<std::vector<int>>& grid){ if(grid.empty()||grid[0].empty())return 0; int R=(int)grid.size(),C=(int)grid[0].size(); std::vector<std::vector<bool>> seen(R,std::vector<bool>(C,false)); int count=0; for(int r=0;r<R;r++){ for(int c=0;c<C;c++){ if(grid[r][c]==1&&!seen[r][c]){ count++; seen[r][c]=true; std::vector<std::pair<int,int>> st; st.push_back({r,c}); while(!st.empty()){ auto cur=st.back(); st.pop_back(); int cr=cur.first,cc=cur.second; int dr[4]={1,-1,0,0},dc[4]={0,0,1,-1}; for(int k=0;k<4;k++){ int nr=cr+dr[k],nc=cc+dc[k]; if(nr<0||nr>=R||nc<0||nc>=C)continue; if(seen[nr][nc])continue; if(grid[nr][nc]!=1)continue; seen[nr][nc]=true; st.push_back({nr,nc}); } } } } return count; } } };',
    },
    skip: { c: 'no int[][] argument parser in the C driver — a nested JSON grid would be atoi()\'d into a single int' },
  },
  {
    name: 'Flood Fill',
    number: 316,
    cases: [
        ['[[5,5,5]]\n0\n1\n7', '[[7,7,7]]'],
        ['[[2,2,1,0],[2,2,0,1],[2,0,0,2]]\n2\n2\n2', '[[2,2,1,0],[2,2,2,1],[2,2,2,2]]'],
        ['[[1,1,1,0],[0,0,1,0],[1,0,2,2]]\n2\n2\n0', '[[1,1,1,0],[0,0,1,0],[1,0,0,0]]'],
        ['[[2],[0]]\n0\n0\n2', '[[2],[0]]'],
        ['[[0,1,2]]\n0\n0\n0', '[[0,1,2]]'],
        ['[[1,2],[0,2],[2,1]]\n0\n0\n2', '[[2,2],[0,2],[2,1]]'],
        ['[[1,1,2],[0,1,2],[1,0,0]]\n0\n0\n3', '[[3,3,2],[0,3,2],[1,0,0]]'],
        ['[[1,1],[1,1]]\n0\n0\n3', '[[3,3],[3,3]]'],
        ['[[1,1,1],[1,1,0],[1,0,1]]\n1\n1\n2', '[[2,2,2],[2,2,0],[2,0,1]]'],
        ['[[0,0,0],[0,1,1]]\n1\n1\n1', '[[0,0,0],[0,1,1]]'],
        ['[[2,1,0,2]]\n0\n2\n3', '[[2,1,3,2]]'],
        ['[[1,0,1],[0,1,0],[1,0,1]]\n1\n1\n9', '[[1,0,1],[0,9,0],[1,0,1]]'],
        ['[[1]]\n0\n0\n0', '[[0]]'],
        ['[[1,0,2,1]]\n0\n0\n2', '[[2,0,2,1]]'],
        ['[[2,2,0],[0,2,2],[1,1,0],[2,2,0]]\n3\n0\n1', '[[2,2,0],[0,2,2],[1,1,0],[1,1,0]]'],
    ],
    // int[][](int[][], int, int, int) - four scalars after the grid; returns a filled copy, not a mutation.
    refs: {
      javascript: 'function floodFill(image,sr,sc,color){if(!image.length||!image[0].length)return image;const img=image.map(r=>r.slice());const old=img[sr][sc];if(old===color)return img;const st=[[sr,sc]];img[sr][sc]=color;while(st.length){const[r,c]=st.pop();const nb=[[r+1,c],[r-1,c],[r,c+1],[r,c-1]];for(const[nr,nc]of nb){if(nr<0||nr>=img.length||nc<0||nc>=img[0].length)continue;if(img[nr][nc]!==old)continue;img[nr][nc]=color;st.push([nr,nc]);}}return img;}',
      python: 'class Solution:\n    def floodFill(self, image, sr, sc, color):\n        if not image or not image[0]:\n            return image\n        img = [row[:] for row in image]\n        old = img[sr][sc]\n        if old == color:\n            return img\n        st = [(sr, sc)]\n        img[sr][sc] = color\n        while st:\n            r, c = st.pop()\n            for nr, nc in ((r+1,c),(r-1,c),(r,c+1),(r,c-1)):\n                if nr<0 or nr>=len(img) or nc<0 or nc>=len(img[0]): continue\n                if img[nr][nc] != old: continue\n                img[nr][nc] = color\n                st.append((nr, nc))\n        return img',
      java: 'class Solution { public int[][] floodFill(int[][] image,int sr,int sc,int color){ if(image.length==0||image[0].length==0)return image; int R=image.length,C=image[0].length; int[][] img=new int[R][C]; for(int r=0;r<R;r++)img[r]=java.util.Arrays.copyOf(image[r],C); int old=img[sr][sc]; if(old==color)return img; java.util.ArrayDeque<int[]> st=new java.util.ArrayDeque<>(); st.push(new int[]{sr,sc}); img[sr][sc]=color; while(!st.isEmpty()){ int[] cur=st.pop(); int r=cur[0],c=cur[1]; int[][] nb={{r+1,c},{r-1,c},{r,c+1},{r,c-1}}; for(int[] p:nb){ int nr=p[0],nc=p[1]; if(nr<0||nr>=R||nc<0||nc>=C)continue; if(img[nr][nc]!=old)continue; img[nr][nc]=color; st.push(p); } } return img; } }',
      cpp: 'class Solution { public: std::vector<std::vector<int>> floodFill(std::vector<std::vector<int>>& image,int sr,int sc,int color){ if(image.empty()||image[0].empty())return image; std::vector<std::vector<int>> img=image; int R=(int)img.size(),C=(int)img[0].size(); int old=img[sr][sc]; if(old==color)return img; std::vector<std::pair<int,int>> st; st.push_back({sr,sc}); img[sr][sc]=color; while(!st.empty()){ auto cur=st.back(); st.pop_back(); int r=cur.first,c=cur.second; int dr[4]={1,-1,0,0},dc[4]={0,0,1,-1}; for(int k=0;k<4;k++){ int nr=r+dr[k],nc=c+dc[k]; if(nr<0||nr>=R||nc<0||nc>=C)continue; if(img[nr][nc]!=old)continue; img[nr][nc]=color; st.push_back({nr,nc}); } } return img; } };',
    },
    skip: { c: 'no int[][] argument parser in the C driver — a nested JSON grid would be atoi()\'d into a single int' },
  },
  {
    name: 'Binary Tree Inorder Traversal',
    number: 320,
    cases: [
        ['[1,null,2,3]', '[1,3,2]'],
        ['[-10]', '[-10]'],
        ['[7,6,-8,-13,-8,-7,-6,0,null,20,20,-18,16,null,null,null,null,null,null,-12,-2]', '[0,-13,6,20,-8,-12,20,-2,7,-18,-7,16,-8,-6]'],
        ['[3,null,-17]', '[3,-17]'],
        ['[-12,-20]', '[-20,-12]'],
        ['[-6,-9,-16,null,-4,null,5,null,null,6,-2]', '[-9,-4,-6,-16,6,5,-2]'],
        ['[5,3,1,0,2]', '[0,3,2,5,1]'],
        ['[1]', '[1]'],
        ['[1,-5,null,-6,14,null,-4]', '[-6,-4,-5,14,1]'],
        ['[-19]', '[-19]'],
        ['[4,2,6,1,3,5,7]', '[1,2,3,4,5,6,7]'],
        ['[3,-17]', '[-17,3]'],
        ['[7,3,15,null,null,9,20]', '[3,7,9,15,20]'],
        ['[]', '[]'],
        ['[3]', '[3]'],
    ],
    // int[](TreeNode) - the driver rebuilds the level-order array before the ref runs.
    refs: {
      javascript: 'function inorderTraversal(root){if(!root)return[];const out=[];const st=[];let cur=root;while(cur||st.length){while(cur){st.push(cur);cur=cur.left;}cur=st.pop();out.push(cur.val);cur=cur.right;}return out;}',
      python: 'class Solution:\n    def inorderTraversal(self, root):\n        if not root:\n            return []\n        out = []\n        st = []\n        cur = root\n        while cur or st:\n            while cur:\n                st.append(cur)\n                cur = cur.left\n            cur = st.pop()\n            out.append(cur.val)\n            cur = cur.right\n        return out',
      java: 'class Solution { public int[] inorderTraversal(TreeNode root){ if(root==null)return new int[0]; java.util.ArrayList<Integer> out=new java.util.ArrayList<>(); java.util.ArrayDeque<TreeNode> st=new java.util.ArrayDeque<>(); TreeNode cur=root; while(cur!=null||!st.isEmpty()){ while(cur!=null){ st.push(cur); cur=cur.left; } cur=st.pop(); out.add(cur.val); cur=cur.right; } int[] res=new int[out.size()]; for(int i=0;i<res.length;i++)res[i]=out.get(i); return res; } }',
      cpp: 'class Solution { public: std::vector<int> inorderTraversal(TreeNode* root){ std::vector<int> out; if(!root)return out; std::vector<TreeNode*> st; TreeNode* cur=root; while(cur||!st.empty()){ while(cur){ st.push_back(cur); cur=cur->left; } cur=st.back(); st.pop_back(); out.push_back(cur->val); cur=cur->right; } return out; } };',
    },
    skip: { c: 'no tree argument parser in the C driver' },
  },
  {
    name: 'Lowest Common Ancestor of a BST',
    number: 322,
    cases: [
        ['[13,-4,null,-29,3,null,-24,null,null,-26,-23,null,null,null,-17]\n-23\n-26', '-24'],
        ['[14,-16,21,-20,4,null,22,-25,null,-8,null,null,null,null,-21]\n-8\n4', '4'],
        ['[-30]\n-30\n-30', '-30'],
        ['[-8]\n-8\n-8', '-8'],
        ['[6,2,8,0,4,7,9,null,null,3,5]\n2\n8', '6'],
        ['[2,1]\n1\n1', '1'],
        ['[2,1,3]\n1\n3', '2'],
        ['[-19,null,24,8,26,-18,22,null,null,null,1,19]\n22\n19', '22'],
        ['[-30,null,-17,-26,2,null,null,-11,7,-12,-4]\n-4\n-11', '-11'],
        ['[6,2,8,0,4,7,9,null,null,3,5]\n2\n5', '2'],
        ['[0,-5,3]\n-5\n3', '0'],
        ['[-4,-18,26,-30,-8,9,29,null,-22,null,null,null,20]\n29\n-18', '-4'],
        ['[3,-2,4,-6,null,null,17,-17,-5,null,null,null,-16]\n-2\n-16', '-2'],
        ['[2,-25,null,null,-18]\n2\n-25', '2'],
        ['[2,1,3]\n2\n3', '2'],
    ],
    // int(TreeNode, int, int) - tree plus scalar positions; falls back to p when the walk ends on a null.
    refs: {
      javascript: 'function lowestCommonAncestor(root,p,q){let cur=root;if(!cur)return p;const lo=Math.min(p,q),hi=Math.max(p,q);while(cur&&cur.val!==lo&&cur.val!==hi){if(cur.val<lo)cur=cur.right;else if(cur.val>hi)cur=cur.left;else break;}return cur?cur.val:p;}',
      python: 'class Solution:\n    def lowestCommonAncestor(self, root, p, q):\n        cur = root\n        if not cur:\n            return p\n        lo, hi = min(p, q), max(p, q)\n        while cur and cur.val != lo and cur.val != hi:\n            if cur.val < lo:\n                cur = cur.right\n            elif cur.val > hi:\n                cur = cur.left\n            else:\n                break\n        return cur.val if cur else p',
      java: 'class Solution { public int lowestCommonAncestor(TreeNode root,int p,int q){ TreeNode cur=root; if(cur==null)return p; int lo=Math.min(p,q),hi=Math.max(p,q); while(cur!=null&&cur.val!=lo&&cur.val!=hi){ if(cur.val<lo)cur=cur.right; else if(cur.val>hi)cur=cur.left; else break; } return cur!=null?cur.val:p; } }',
      cpp: 'class Solution { public: int lowestCommonAncestor(TreeNode* root,int p,int q){ TreeNode* cur=root; if(!cur)return p; int lo=p<q?p:q,hi=p<q?q:p; while(cur&&cur->val!=lo&&cur->val!=hi){ if(cur->val<lo)cur=cur->right; else if(cur->val>hi)cur=cur->left; else break; } return cur?cur->val:p; } };',
    },
    skip: { c: 'no tree argument parser in the C driver' },
  },
];

type Case = { input: string; expected: string };

/** Frames cases exactly as `runBatched` in codeExecution.ts does. */
function frame(cases: Case[]): string {
  return cases
    .map((c) => {
      const body = c.input;
      const n = body.length === 0 ? 0 : body.replace(/\n$/, '').split('\n').length;
      return `__CASE__${n}\n${body}`;
    })
    .join('\n');
}

async function runOnPiston(lang: Lang, code: string, stdin: string) {
  const b = SANDBOX_BUDGETS[lang as keyof typeof SANDBOX_BUDGETS];
  const payload = {
    language: LANG[lang],
    version: '*',
    files: [{ name: FILE_NAME[lang], content: code }],
    stdin,
    compile_timeout: b.compileTimeoutMs,
    run_timeout: b.runTimeoutMs,
    run_cpu_time: b.runCpuTimeMs,
    compile_memory_limit: b.compileMemoryLimitBytes,
    run_memory_limit: b.runMemoryLimitBytes,
  };
  return (await fireOnPiston(lang as any, payload as Record<string, unknown>)) as any;
}

async function main() {
  const onlyLangs = (process.argv.find((a) => a.startsWith('--langs=')) || '')
    .replace('--langs=', '').split(',').filter(Boolean) as Lang[];
  const onlyNums = (process.argv.find((a) => a.startsWith('--only=')) || '')
    .replace('--only=', '').split(',').filter(Boolean).map((s) => parseInt(s, 10));
  const langs = LANGS.filter((l) => onlyLangs.length === 0 || onlyLangs.includes(l));
  const specs = onlyNums.length
    ? SPECS.filter((s) => onlyNums.includes(s.number ?? 0))
    : SPECS;

  console.log(`Piston: ${PISTON}`);
  console.log(`problems: ${specs.length}  languages: ${langs.length}`);
  console.log('');

  const failures: string[] = [];
  let pass = 0, skip = 0, casesChecked = 0;

  for (const spec of specs) {
    // Prefer the live database copy; fall back to the embedded one so this runs
    // on a CI database that has never been seeded. Either way, flag it when the
    // two disagree — that means a stored case drifted from this file.
    let source = 'embedded';
    let cases: Case[] = spec.cases.map(([input, expected]) => ({
      input,
      expected: expected.trim(),
    }));

    let row: { name: string; test_cases: unknown } | null = null;
    try {
      row = await prisma.problem.findFirst({
        where:
          spec.number != null
            ? { problem_number: spec.number }
            : { OR: [{ github_oid: spec.oid }, { id: spec.oid }] },
        select: {
          name: true,
          // Pin the same order executeCode uses (TestCase has no ordinal
          // column; the id is what both sides pin to).
          test_cases: { select: { input: true, expectedOutput: true, is_public: true }, orderBy: { id: "asc" } },
        },
      });
    } catch {
      // No database reachable. The embedded cases still make this a valid gate.
      row = null;
    }

    if (row) {
      const dbCases = ((row.test_cases ?? []) as any[]).map((c) => ({
        input: String(c.input ?? '').replace(/\n$/, ''),
        expected: String(c.expectedOutput ?? '').trim(),
      }));
      if (dbCases.length) {
        source = 'db';
        const drift =
          dbCases.length !== cases.length ||
          dbCases.some((d, i) => d.input !== cases[i]!.input || d.expected !== cases[i]!.expected);
        if (drift) {
          failures.push(
            `${spec.name}: stored cases have drifted from the copy embedded in verify_matrix.ts ` +
              `(${dbCases.length} in DB vs ${cases.length} embedded) — re-copy them`,
          );
        }
        cases = dbCases;
      }
    }

    const marks: string[] = [];
    for (const lang of langs) {
      if (spec.skip?.[lang]) { marks.push(`SKIP ${lang}`); skip++; continue; }
      const ref = spec.refs[lang];
      if (!ref) { marks.push(`MISS ${lang}`); skip++; continue; }

      const batched = supportsBatching(lang) && cases.length > 1;
      let j: any;
      try {
        const code = prepareFinalCode(lang as any, ref, { code: ref, wrapperCode: null } as any);
        j = await runOnPiston(lang, code, batched ? frame(cases) : cases[0]!.input);
      } catch (e) {
        marks.push(`ERR  ${lang}`);
        failures.push(`${spec.name} / ${lang}: ${String(e).slice(0, 120)}`);
        continue;
      }

      if (j?.compile && j.compile.code !== 0) {
        marks.push(`CERR ${lang}`);
        failures.push(`${spec.name} / ${lang}: COMPILE ${String(j.compile.stderr || j.compile.output || '').trim().split('\n').slice(0, 2).join(' | ').slice(0, 240)}`);
        continue;
      }

      const lines = String(j?.run?.stdout ?? '').split('\n').map((s) => s.trim())
        .filter((s, i, a) => !(s === '' && i === a.length - 1));

      // Unbatched returns one line for case 0; batched returns one per case.
      const got = batched ? lines : [lines[0] ?? ''];
      const want = batched ? cases.map((c) => c.expected) : [cases[0]!.expected];

      if (got.length !== want.length) {
        marks.push(`FAIL ${lang}`);
        failures.push(`${spec.name} / ${lang}: expected ${want.length} output lines, got ${got.length} (exit ${j?.run?.code}, stdout=${JSON.stringify(String(j?.run?.stdout ?? '').slice(0, 100))})`);
        continue;
      }

      const bad = got.map((g, i) => ({ g, w: want[i]!, i })).filter((x) => x.g !== x.w);
      if (bad.length) {
        marks.push(`FAIL ${lang}`);
        failures.push(`${spec.name} / ${lang}: ${bad.length}/${want.length} wrong — case${bad[0]!.i} got ${JSON.stringify(bad[0]!.g.slice(0, 60))} want ${JSON.stringify(bad[0]!.w.slice(0, 60))}`);
        continue;
      }

      casesChecked += want.length;
      pass++;
      marks.push(`${batched ? 'PASS*' : 'PASS '} ${lang}`);
    }
    console.log(`${spec.name.padEnd(32)} ${marks.join('  ')}   [cases: ${source}]`);
  }

  console.log(`\npassed: ${pass}, failed: ${failures.length}, skipped: ${skip}, cases checked: ${casesChecked}`);
  console.log('PASS* = verified through the batched __CASE__ framing');
  if (failures.length) {
    console.log('\nFAILURES');
    for (const f of failures) console.log(`  - ${f}`);
    process.exitCode = 1;
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error('matrix crashed:', e); process.exitCode = 1; });
