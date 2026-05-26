import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Code2, Terminal, Globe, GitBranch, X } from 'lucide-react'
import { TerminalWidget } from './TerminalWidget'
import { RestApiTester } from './RestApiTester'
import { GitVisualizer } from './GitVisualizer'

export const DevPanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'terminal' | 'api' | 'git'>('terminal')

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.98 }}
        className="fixed bottom-4 right-4 z-[70] w-[600px] h-[450px] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-2 pt-2 bg-zinc-950 border-b border-zinc-800">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('terminal')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors ${activeTab === 'terminal' ? 'bg-zinc-900 text-white border-t border-l border-r border-zinc-800' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Terminal className="w-3.5 h-3.5" /> Terminal
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors ${activeTab === 'api' ? 'bg-zinc-900 text-white border-t border-l border-r border-zinc-800' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Globe className="w-3.5 h-3.5" /> API Tester
            </button>
            <button
              onClick={() => setActiveTab('git')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors ${activeTab === 'git' ? 'bg-zinc-900 text-white border-t border-l border-r border-zinc-800' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <GitBranch className="w-3.5 h-3.5" /> Git
            </button>
          </div>
          
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors mr-2">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 p-3 bg-zinc-900 overflow-hidden">
          {activeTab === 'terminal' && <TerminalWidget />}
          {activeTab === 'api' && <RestApiTester />}
          {activeTab === 'git' && <GitVisualizer />}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
