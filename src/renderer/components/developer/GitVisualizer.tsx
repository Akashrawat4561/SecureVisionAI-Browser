import React from 'react'
import { GitBranch, GitPullRequest } from 'lucide-react'

const MOCK_COMMITS = [
  { hash: 'e3f1b4a', msg: 'feat: add E2EE sync server', author: 'GC', time: '10m ago' },
  { hash: '8a91b22', msg: 'fix: productivity overlays', author: 'GC', time: '1h ago' },
  { hash: '3c4d5e6', msg: 'feat: phase 5 extension system', author: 'GC', time: '2h ago' },
  { hash: 'f1a2b3c', msg: 'feat: phase 4 security engine', author: 'GC', time: '5h ago' },
]

export const GitVisualizer: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 text-sm">
      <div className="flex items-center justify-between p-3 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-2 text-zinc-300 font-semibold text-xs uppercase tracking-wider">
          <GitBranch className="w-4 h-4 text-purple-400" /> main
        </div>
        <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg text-xs transition-colors">
          <GitPullRequest className="w-3.5 h-3.5" /> Pull
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {MOCK_COMMITS.map((commit, idx) => (
          <div key={commit.hash} className="flex items-start gap-3 relative">
            {/* Timeline line */}
            {idx !== MOCK_COMMITS.length - 1 && (
              <div className="absolute top-6 left-2.5 w-0.5 h-full bg-zinc-800 -z-10" />
            )}
            
            <div className="w-5 h-5 rounded-full bg-zinc-800 border-2 border-purple-500 flex items-center justify-center shrink-0 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            </div>

            <div className="flex-1">
              <div className="text-zinc-200 font-medium">{commit.msg}</div>
              <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                <span className="font-mono text-purple-400">{commit.hash}</span>
                <span>•</span>
                <span>{commit.author}</span>
                <span>•</span>
                <span>{commit.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
