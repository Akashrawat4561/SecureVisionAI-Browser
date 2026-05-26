import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, X, Play, RefreshCw } from 'lucide-react'

export const TerminalWidget: React.FC = () => {
  const [output, setOutput] = useState<string[]>([
    'SecureVision OS Terminal v1.0.0',
    'Connected to local shell (mock). Type "help" for commands.',
  ])
  const [input, setInput] = useState('')

  const handleCommand = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      const cmd = input.trim()
      setOutput((prev) => [...prev, `$ ${cmd}`])
      
      // Basic mock command handling
      if (cmd === 'clear') {
        setOutput([])
      } else if (cmd === 'help') {
        setOutput((prev) => [...prev, 'Available commands: clear, help, echo, ping, git status'])
      } else if (cmd === 'git status') {
        setOutput((prev) => [
          ...prev, 
          'On branch main', 
          'Your branch is up to date with "origin/main".',
          'nothing to commit, working tree clean'
        ])
      } else if (cmd.startsWith('echo ')) {
        setOutput((prev) => [...prev, cmd.substring(5)])
      } else {
        setOutput((prev) => [...prev, `Command not found: ${cmd}`])
      }
      
      setInput('')
    }
  }

  return (
    <div className="flex flex-col h-full bg-black font-mono text-xs rounded-xl overflow-hidden border border-zinc-800">
      <div className="flex justify-between items-center px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 text-zinc-400">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5" />
          <span>Local Terminal (bash)</span>
        </div>
        <div className="flex gap-2">
          <button className="hover:text-white"><RefreshCw className="w-3.5 h-3.5" /></button>
          <button className="hover:text-white"><Play className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1 text-green-400">
        {output.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
      <div className="flex items-center gap-2 p-2 border-t border-zinc-800 text-green-400">
        <span>$</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleCommand}
          className="flex-1 bg-transparent outline-none text-white font-mono placeholder:text-zinc-600"
          autoFocus
          spellCheck={false}
        />
      </div>
    </div>
  )
}
