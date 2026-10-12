import 'dotenv/config';
process.env.NODE_MODE='development'; process.env.PISTON_URL=process.env.PISTON_URL||'http://127.0.0.1:2000';

// Correct LeetCode-style JS solutions keyed by problem_number.
const SOL: Record<number, string> = {
  // ── TREES ──
  11: `var isSameTree=function(p,q){if(!p&&!q)return true;if(!p||!q)return false;return p.val===q.val&&isSameTree(p.left,q.left)&&isSameTree(p.right,q.right);};`,
  12: `var isSymmetric=function(root){const m=(a,b)=>{if(!a&&!b)return true;if(!a||!b)return false;return a.val===b.val&&m(a.left,b.right)&&m(a.right,b.left);};return m(root,root);};`,
  13: `var levelOrder=function(root){const r=[];if(!root)return r;const q=[root];while(q.length){const sz=q.length,row=[];for(let i=0;i<sz;i++){const n=q.shift();row.push(n.val);if(n.left)q.push(n.left);if(n.right)q.push(n.right);}r.push(row);}return r;};`,
  14: `var zigzagLevelOrder=function(root){const r=[];if(!root)return r;const q=[root];let L=false;while(q.length){const sz=q.length,row=[];for(let i=0;i<sz;i++){const n=q.shift();L?row.unshift(n.val):row.push(n.val);if(n.left)q.push(n.left);if(n.right)q.push(n.right);}r.push(row);L=!L;}return r;};`,
  16: `var maxDepth=function(root){if(!root)return 0;return 1+Math.max(maxDepth(root.left),maxDepth(root.right));};`,
  17: `var buildTree=function(preorder,inorder){if(!preorder.length)return null;const v=preorder[0],r=new TreeNode(v),m=inorder.indexOf(v);r.left=buildTree(preorder.slice(1,m+1),inorder.slice(0,m));r.right=buildTree(preorder.slice(m+1),inorder.slice(m+1));return r;};`,
  19: `var isBalanced=function(root){const h=n=>{if(!n)return 0;const l=h(n.left),rr=h(n.right);if(l<0||rr<0||Math.abs(l-rr)>1)return -1;return 1+Math.max(l,rr);};return h(root)>=0;};`,
  20: `var minDepth=function(root){if(!root)return 0;if(!root.left)return 1+minDepth(root.right);if(!root.right)return 1+minDepth(root.left);return 1+Math.min(minDepth(root.left),minDepth(root.right));};`,
  21: `var flatten=function(root){let p=root;while(p){if(p.left){let r=p.left;while(r.right)r=r.right;r.right=p.right;p.right=p.left;p.left=null;}p=p.right;}};`,
  102: `var lowestCommonAncestor=function(root,p,q){if(!root)return null;if(root.val>p.val&&root.val>q.val)return lowestCommonAncestor(root.left,p,q);if(root.val<p.val&&root.val<q.val)return lowestCommonAncestor(root.right,p,q);return root;};`,
  143: `var diameterOfBinaryTree=function(root){let d=0;const h=n=>{if(!n)return 0;const l=h(n.left),r=h(n.right);d=Math.max(d,l+r);return 1+Math.max(l,r);};h(root);return d;};`,
  145: `var isSubtree=function(root,subRoot){const eq=(a,b)=>{if(!a&&!b)return true;if(!a||!b)return false;return a.val===b.val&&eq(a.left,b.left)&&eq(a.right,b.right);};const sub=n=>{if(!n)return false;if(eq(n,subRoot))return true;return sub(n.left)||sub(n.right);};return sub(root);};`,
  183: `var isValidBST=function(root){const v=(n,lo,hi)=>{if(!n)return true;if(n.val<=lo||n.val>=hi)return false;return v(n.left,lo,n.val)&&v(n.right,n.val,hi);};return v(root,-Infinity,Infinity);};`,
  // ── LISTS ──
  2: `var addTwoNumbers=function(l1,l2){const d=new ListNode(0);let c=d,k=0;while(l1||l2||k){let s=k+(l1?l1.val:0)+(l2?l2.val:0);k=Math.floor(s/10);c.next=new ListNode(s%10);c=c.next;if(l1)l1=l1.next;if(l2)l2=l2.next;}return d.next;};`,
  34: `var reorderList=function(head){if(!head)return;let s=head,f=head;while(f.next&&f.next.next){s=s.next;f=f.next.next;}let prev=null,cur=s.next;s.next=null;while(cur){const nx=cur.next;cur.next=prev;prev=cur;cur=nx;}let a=head,b=prev;while(b){const t1=a.next,t2=b.next;a.next=b;b.next=t1;a=t1;b=t2;}};`,
  148: `var rotateRight=function(head,k){if(!head||!head.next||k===0)return head;let len=1,tail=head;while(tail.next){tail=tail.next;len++;}k=k%len;if(k===0)return head;let cut=len-k,node=head;for(let i=1;i<cut;i++)node=node.next;const nh=node.next;node.next=null;tail.next=head;return nh;};`,
  175: `var deleteDuplicates=function(head){const d=new ListNode(0);d.next=head;let p=d;while(p.next){let c=p.next;while(c.next&&c.next.val===c.val)c=c.next;if(c!==p.next)p.next=c.next;else p=p.next;}return d.next;};`,
  176: `var deleteDuplicates=function(head){let c=head;while(c&&c.next){if(c.val===c.next.val)c.next=c.next.next;else c=c.next;}return head;};`,
  179: `var middleNode=function(head){let s=head,f=head;while(f&&f.next){s=s.next;f=f.next.next;}return s;};`,
  181: `var reverseBetween=function(head,left,right){const d=new ListNode(0);d.next=head;let p=d;for(let i=1;i<left;i++)p=p.next;let cur=p.next;for(let i=left;i<right;i++){const nx=cur.next;cur.next=nx.next;nx.next=p.next;p.next=nx;}return d.next;};`,
  107: `var reverseKGroup=function(head,k){const rev=(a,b)=>{let prev=b,cur=a;while(cur!==b){const nx=cur.next;cur.next=prev;prev=cur;cur=nx;}return prev;};const d=new ListNode(0);d.next=head;let g=d;while(true){let t=g;for(let i=0;i<k&&t;i++)t=t.next;if(!t)break;const nx=t.next;const st=g.next;g.next=rev(st,nx);g=st;}return d.next;};`,
  105: `var mergeKLists=function(lists){const merge=(a,b)=>{const d=new ListNode(0);let c=d;while(a&&b){if(a.val<=b.val){c.next=a;a=a.next;}else{c.next=b;b=b.next;}c=c.next;}c.next=a||b;return d.next;};let res=null;for(const l of lists){res=merge(res,l);}return res;};`,
  // ── GRAPHS ──
  108: `var validTree=function(n,edges){if(edges.length!==n-1)return false;const p=Array.from({length:n},(_,i)=>i);const f=x=>{while(p[x]!==x){p[x]=p[p[x]];x=p[x];}return x;};for(const [a,b] of edges){const ra=f(a),rb=f(b);if(ra===rb)return false;p[ra]=rb;}return true;};`,
  186: `var findOrder=function(numCourses,prerequisites){const adj=Array.from({length:numCourses},()=>[]);const ind=Array(numCourses).fill(0);for(const [c,pr] of prerequisites){adj[pr].push(c);ind[c]++;}const q=[];for(let i=0;i<numCourses;i++)if(ind[i]===0)q.push(i);const out=[];while(q.length){const u=q.shift();out.push(u);for(const v of adj[u])if(--ind[v]===0)q.push(v);}return out.length===numCourses?out:[];};`,
  // ── 2D ──
  166: `var searchMatrix=function(matrix,target){const m=matrix.length,n=(matrix[0]||[]).length;let l=0,r=m*n-1;while(l<=r){const mid=(l+r)>>1;const v=matrix[Math.floor(mid/n)][mid%n];if(v===target)return true;if(v<target)l=mid+1;else r=mid-1;}return false;};`,
};

async function main() {
  const { prisma } = await import('../lib/prisma.js');
  const { executeCode } = await import('../services/codeExecution.js');
  const nums = Object.keys(SOL).map(Number);
  const rows = await prisma.problem.findMany({ where: { problem_number: { in: nums } }, select: { id: true, problem_number: true, name: true } });
  const idByNum: Record<number,string> = {}; const nameByNum: Record<number,string> = {};
  for (const r of rows) { idByNum[r.problem_number!] = r.id; nameByNum[r.problem_number!] = r.name; }
  let pass=0, fail=0; const failures: string[] = [];
  for (const n of nums) {
    if (!idByNum[n]) { console.log(`  SKIP #${n} (not in DB)`); continue; }
    const req:any = { body: { code: SOL[n], language: 'javascript', oid: idByNum[n], mode: 'SUBMIT' }, cookies: {} };
    const res:any = { statusCode:200, status(s:number){this.statusCode=s;return this;}, json(o:any){this._body=o;return this;} };
    try {
      await executeCode(req, res);
      const b = res._body;
      const ok = b?.passedCases === b?.totalCases && b?.totalCases>0;
      if (ok) { pass++; console.log(`  PASS #${n} ${nameByNum[n]} ${b.passedCases}/${b.totalCases}`); }
      else {
        fail++;
        const ff=(Array.isArray(b?.details)?b.details:[]).find((d:any)=>!d.passed);
        const detail = ff?`case${ff.testCaseIndex}: got=${JSON.stringify(ff.output)} exp=${JSON.stringify(ff.expectedOutput)}`:`status=${b?.status} ${b?.passedCases}/${b?.totalCases}`;
        failures.push(`#${n} ${nameByNum[n]} — ${detail}`);
        console.log(`  FAIL #${n} ${nameByNum[n]} — ${detail}`);
      }
    } catch(e:any) { fail++; failures.push(`#${n} ${nameByNum[n]} — ${String(e.message).slice(0,120)}`); console.log(`  ERR #${n} ${nameByNum[n]} — ${String(e.message).slice(0,120)}`); }
  }
  console.log(`\n==== SWEEP ====\npassed: ${pass}, failed: ${fail}`);
  if (failures.length) { console.log('\nFailures:'); for(const f of failures) console.log('  x '+f); }
  await prisma.$disconnect(); process.exit(fail?1:0);
}
main().catch(e=>{console.error(e);process.exit(1);});
