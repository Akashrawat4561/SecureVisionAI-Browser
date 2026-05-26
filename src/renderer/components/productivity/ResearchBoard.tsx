import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutGrid, Plus, FileText, Globe, X, Search } from 'lucide-react'

interface BoardItem {
  id: string
  title: string
  type: 'bookmark' | 'note' | 'summary'
  content: string
  url?: string
}

const MOCK_ITEMS: BoardItem[] = [
  { id: '1', title: 'React Performance', type: 'bookmark', content: 'Good guide on useMemo and useCallback', url: 'https://react.dev' },
  { id: '2', title: 'AI Sidebar Architecture', type: 'note', content: 'We need to ensure token isolation per tab using Zustand stores.' },
  { id: '3', title: 'Electron IPC Security', type: 'summary', content: 'Never expose store.set to the renderer. Always use discrete allowlisted channels for safety.', url: 'https://electronjs.org' },
]

export const ResearchBoard: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [items, setItems] = useState<BoardItem[]>(MOCK_ITEMS)
  const [query, setQuery] = useState('')

  if (!isOpen) return null

  const filtered = items.filter(i => 
    i.title.toLowerCase().includes(query.toLowerCase()) || 
    i.content.toLowerCase().includes(query.toLowerCase())
  )

  const getTypeIcon = (type: BoardItem['type']) => {
    switch (type) {
      case 'bookmark': return <Globe className="w-4 h-4 text-blue-400" />
      case 'note': return <FileText className="w-4 h-4 text-amber-400" />
      case 'summary': return <LayoutGrid className="w-4 h-4 text-purple-400" />
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/60 backdrop-blur-sm"
      >
        <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-6xl h-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
          
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-zinc-950/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <LayoutGrid className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Research Board</h2>
                <p className="text-xs text-zinc-500">Organize bookmarks, notes, and AI summaries</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
                <Search className="w-4 h-4 text-zinc-500" />
                <input 
                  type="text" 
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search research..." 
                  className="bg-transparent border-none outline-none text-sm text-zinc-200 placeholder:text-zinc-600 w-64"
                />
              </div>
              <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">
                <Plus className="w-4 h-4" /> Add Note
              </button>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Masonry Grid */}
          <div className="flex-1 overflow-y-auto p-6 bg-zinc-900/50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(item => (
                <motion.div 
                  key={item.id}
                  layoutId={item.id}
                  whileHover={{ y: -2 }}
                  className="bg-zinc-800/50 border border-white/5 rounded-xl p-4 hover:border-white/15 transition-all group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-widest bg-white/5 border border-white/10 flex items-center gap-1.5 text-zinc-300">
                      {getTypeIcon(item.type)} {item.type}
                    </span>
                    <button className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 transition-all rounded">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <h3 className="text-sm font-semibold text-white mb-2 leading-snug">{item.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-4">{item.content}</p>
                  
                  {item.url && (
                    <div className="pt-3 border-t border-white/5 text-[10px] text-blue-400 truncate w-full cursor-pointer hover:underline">
                      {item.url}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
            
            {filtered.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-3">
                <LayoutGrid className="w-12 h-12 opacity-20" />
                <p>No research items match your query.</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
