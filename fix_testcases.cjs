const fs = require('fs');
let content = fs.readFileSync('src/pages/Battle.tsx', 'utf-8');

// 1. Update activePanelTab state
content = content.replace(
  'const [activePanelTab, setActivePanelTab] = useState<"PROBLEM" | "CHAT" | "TEST_CASES">("PROBLEM");',
  'const [activePanelTab, setActivePanelTab] = useState<"PROBLEM" | "CHAT">("PROBLEM");'
);

// 2. Remove TEST_CASES tab button
content = content.replace(
  /               <button onClick=\{\(\) => setActivePanelTab\("TEST_CASES"\)\}[\s\S]*?TEST CASES\n              <\/button>\n/,
  ''
);

// 3. Extract the test cases map loop
const startMatch = '{activeProblem?.test_cases?.map((prob: any, index: number) => {';
const startIndex = content.indexOf(startMatch);
if (startIndex === -1) throw new Error("Could not find start index");
const endMatch = '                  })}';
const endIndex = content.indexOf(endMatch, startIndex);
const testCasesLoop = content.substring(startIndex, endIndex + endMatch.length) + '\n';

// 4. Update the chat condition and remove the TEST_CASES panel
const panelStart = ') : activePanelTab==="CHAT"? (';
const panelStartIdx = content.indexOf(panelStart);
const panelEndStr = '              )}';
const panelEndIdx = content.indexOf(panelEndStr, panelStartIdx + 300); 
// we want the second closing parenthesis, or we can just regex the whole block
const chatBlock = `) : (
                <div className="flex flex-col h-full">
                  <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-4">
                    {battleMessages.map(msg => (
                      <div key={msg.id} className={\`px-3 py-2 rounded-xl max-w-[85%] font-mono text-sm \${msg.socketId === socket?.id ? 'bg-cyan-900/40 border border-cyan-500/30 text-cyan-100 self-end' : 'bg-slate-800/50 border border-slate-700 text-slate-300 self-start'}\`}>
                        {msg.content}
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <form onSubmit={handleBattleMessage} className="mt-auto flex gap-2 pt-2 border-t border-cyan-500/20">
                    <input type="text" value={newBattleMessage} onChange={(e) => setNewBattleMessage(e.target.value)} placeholder="TRANSMIT..." className="flex-1 bg-black/50 border border-slate-700 p-3 rounded-lg text-white font-mono text-xs focus:border-cyan-500 focus:outline-none" />
                    <button type="submit" className="p-3 bg-cyan-950/40 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 rounded-lg transition-all"><Send className="w-4 h-4" /></button>
                  </form>
                </div>
              )`;
              
content = content.replace(
  /\) : activePanelTab==="CHAT"\? \([\s\S]*?                  \}\)\}\n                <\/div>\n              <\/div>\n            \)\}/,
  chatBlock
);


// 5. Update the terminal body
const terminalReplacement = `            {/* Terminal Body */}
            {isTerminal && (
              <div className="h-64 p-4 bg-black/60 overflow-y-auto font-mono text-xs text-slate-300 shadow-inner border-t border-cyan-500/10 flex flex-col gap-4">
                {terminalOutput !== "// COMPILATION LOGS WILL BE DISPLAYED HERE" && typeof terminalOutput === "string" && (
                  <pre className="whitespace-pre-wrap text-emerald-400 mb-4">{terminalOutput}</pre>
                )}
                
                <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                  <h3 className="font-mono text-cyan-400 font-bold tracking-widest text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4" /> TEST RESULTS
                  </h3>
                  <span className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 px-3 py-1 rounded text-xs font-mono font-bold">
                    TOTAL: {activeProblem?.test_cases?.length || 0}
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-hide">
                  ${testCasesLoop}
                </div>
              </div>
            )}`;

content = content.replace(
  /\{\/\* Terminal Body \*\/\}\n            \{isTerminal && \(\n              <div className="h-48 p-4 bg-black\/60 overflow-y-auto font-mono text-xs text-slate-300 shadow-inner border-t border-cyan-500\/10">\n                <pre className="whitespace-pre-wrap">\{terminalOutput\}<\/pre>\n              <\/div>\n            \)\}/,
  terminalReplacement
);

fs.writeFileSync('src/pages/Battle.tsx', content);
console.log("Done");
