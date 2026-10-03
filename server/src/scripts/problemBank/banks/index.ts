/**
 * Aggregate index of every generated bank.
 *
 * Import this (never an individual bank) from the seed/verify scripts so a
 * new category only has to be registered here.
 */
import type { ProblemBankEntry } from '../types.js';

import arraysBank from './arrays.js';
import backtrackingBank from './backtracking.js';
import bitBank from './bit.js';
import bstBank from './bst.js';
import fenwickBank from './fenwick.js';
import graphBank from './graph.js';
import greedyBank from './greedy.js';
import hashTableBank from './hashTable.js';
import heapBank from './heap.js';
import linkedListBank from './linkedList.js';
import mathBank from './math.js';
import queueBank from './queue.js';
import searchingBank from './searching.js';
import segmentTreeBank from './segmentTree.js';
import stackBank from './stack.js';
import trieBank from './trie.js';
import dpBank from './dp.js';
import treeBank from './tree.js';

export const BANK: ProblemBankEntry[] = [
  ...arraysBank,
  ...backtrackingBank,
  ...bitBank,
  ...stackBank,
  ...queueBank,
  ...linkedListBank,
  ...hashTableBank,
  ...treeBank,
  ...bstBank,
  ...heapBank,
  ...graphBank,
  ...trieBank,
  ...segmentTreeBank,
  ...fenwickBank,
  ...searchingBank,
  ...dpBank,
  ...mathBank,
  ...greedyBank,
];

export default BANK;