/**
 * Reference implementations for the operation-sequence problems.
 *
 * These problems exercise a CLASS through a scripted call sequence, so there
 * is no single function to serialize — the reference is a full class body
 * written the way a competitor would submit it.
 *
 * Shared by verify_operation_problems.ts (proves the stored cases pass) and
 * fix_operation_expected.ts (recomputes wrong stored expected outputs), so
 * there is exactly one copy of each algorithm.
 */
export const OPERATION_PROBLEMS = [101, 109, 124, 132, 150, 160, 163];

export const OPERATION_REFERENCES: Record<number, string> = {
  101: `
var MyQueue = function() { this.in = []; this.out = []; };
MyQueue.prototype.push = function(x) { this.in.push(x); };
MyQueue.prototype.pop = function() {
  if (this.out.length === 0) { while (this.in.length) this.out.push(this.in.pop()); }
  return this.out.pop();
};
MyQueue.prototype.peek = function() { return this.pop(); };
MyQueue.prototype.empty = function() { return this.in.length === 0 && this.out.length === 0; };
`,
  109: `
var TimeLimitedCache = function() { this.map = new Map(); };
TimeLimitedCache.prototype.set = function(key, value, duration) {
  this.map.set(key, { value: value, expires: Date.now() + duration });
};
TimeLimitedCache.prototype.get = function(key) {
  if (!this.map.has(key)) return -1;
  const e = this.map.get(key);
  if (Date.now() > e.expires) { this.map.delete(key); return -1; }
  return e.value;
};
TimeLimitedCache.prototype.count = function() { return this.map.size; };
`,
  124: `
var MedianFinder = function() { this.low = []; this.high = []; };
MedianFinder.prototype.addNum = function(num) {
  if (this.low.length === 0 || num <= this.low[this.low.length - 1]) {
    this.low.push(num);
    if (this.high.length && this.low[this.low.length - 1] > this.high[0]) {
      const t = this.low.pop();
      this.high.unshift(t);
    }
  } else {
    this.high.unshift(num);
    if (this.low.length && this.low[this.low.length - 1] > this.high[0]) {
      const t = this.high.shift();
      this.low.push(t);
    }
  }
};
MedianFinder.prototype.findMedian = function() {
  if (this.low.length > this.high.length) return this.low[this.low.length - 1];
  if (this.high.length > this.low.length) return this.high[0];
  return (this.low[this.low.length - 1] + this.high[0]) / 2;
};
`,
  132: `
var Twitter = function() { this.posts = new Map(); this.follows = new Map(); };
Twitter.prototype.postTweet = function(userId, tweetId) {
  if (!this.posts.has(userId)) this.posts.set(userId, []);
  this.posts.get(userId).push(tweetId);
};
Twitter.prototype.follow = function(a, b) {
  if (a === b) return;
  if (!this.follows.has(a)) this.follows.set(a, new Set());
  this.follows.get(a).add(b);
};
Twitter.prototype.unfollow = function(a, b) {
  if (this.follows.has(a)) this.follows.get(a).delete(b);
};
Twitter.prototype.getNewsFeed = function(userId) {
  const me = this.follows.get(userId) || new Set();
  const feed = [];
  for (const entry of this.posts) {
    if (entry[0] === userId || me.has(entry[0])) feed.push(...entry[1]);
  }
  feed.sort(function (a, b) { return b - a; });
  return feed.slice(0, 10);
};
`,
  150: `
var MyCircularQueue = function(k) {
  this.cap = k; this.data = new Array(k); this.head = 0; this.size = 0;
};
MyCircularQueue.prototype.enQueue = function(value) {
  if (this.size === this.cap) return false;
  this.data[(this.head + this.size) % this.cap] = value;
  this.size++;
  return true;
};
MyCircularQueue.prototype.deQueue = function() {
  if (this.size === 0) return false;
  this.head = (this.head + 1) % this.cap;
  this.size--;
  return true;
};
MyCircularQueue.prototype.Front = function() {
  return this.size === 0 ? -1 : this.data[this.head];
};
MyCircularQueue.prototype.Rear = function() {
  return this.size === 0 ? -1 : this.data[(this.head + this.size - 1) % this.cap];
};
MyCircularQueue.prototype.isEmpty = function() { return this.size === 0; };
MyCircularQueue.prototype.isFull = function() { return this.size === this.cap; };
`,
  160: `
var KthLargest = function(k, nums) {
  this.k = k; this.heap = nums.slice();
  this.heap.sort(function (a, b) { return a - b; });
};
KthLargest.prototype.add = function(val) {
  this.heap.push(val);
  this.heap.sort(function (a, b) { return a - b; });
  return this.heap[this.heap.length - this.k];
};
`,
  163: `
var MaxStack = function() { this.s = []; this.m = []; };
MaxStack.prototype.push = function(x) {
  this.s.push(x);
  if (this.m.length === 0 || x >= this.m[this.m.length - 1]) this.m.push(x);
  else this.m.push(this.m[this.m.length - 1]);
};
MaxStack.prototype.pop = function() { this.m.pop(); return this.s.pop(); };
MaxStack.prototype.top = function() { return this.s[this.s.length - 1]; };
MaxStack.prototype.peekMax = function() { return this.m[this.m.length - 1]; };
MaxStack.prototype.popMax = function() {
  const mx = this.m[this.m.length - 1];
  for (let i = this.s.length - 1; i >= 0; i--) {
    if (this.s[i] === mx) { this.s.splice(i, 1); this.m.pop(); return mx; }
  }
};
`,
};