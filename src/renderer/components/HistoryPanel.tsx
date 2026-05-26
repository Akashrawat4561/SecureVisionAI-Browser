import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Globe, Trash2, X, Clock } from 'lucide-react'
import { cn } from '@securevision/ui'

interface HistoryEntry {
  id: string
  url: string
  title: string
  visitedAt: string
  favicon?: string
}

interface HistoryPanelProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (url: string) => void
}

function groupByDate(entries: HistoryEntry[]): Record<string, HistoryEntry[]> {
  return entries.reduce<Record<string, HistoryEntry[]>>((acc, entry) => {
    const date = new Date(entry.visitedAt)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let key: string
    if (date.toDateString() === today.toDateString()) key = 'Today'
    else if (date.toDateString() === yesterday.toDateString()) key = 'Yesterday'
    else key = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

    if (!acc[key]) acc[key] = []
    acc[key].push(entry)
    return acc
  }, {})
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ isOpen, onClose, onNavigate }) => {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [query, setQuery] = useState('')

  const loadHistory = useCallback(() => {
    if (query) {
      window.electronAPI?.invoke?.('history-search', query).then((r: HistoryEntry[]) => setEntries(r || []))
    } else {
      window.electronAPI?.invoke?.('history-get-recent', 200).then((r: HistoryEntry[]) => setEntries(r || []))
    }
  }, [query])

  useEffect(() => {
    if (isOpen) loadHistory()
  }, [isOpen, loadHistory])

  const handleClearAll = () => {
    window.electronAPI?.send?.('history-clear')
    setEntries([])
  }

  const grouped = groupByDate(entries)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="fixed left-0 top-0 h-full w-80 bg-zinc-900/95 backdrop-blur-2xl border-r border-white/10 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/8">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-white">History</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearAll}
                  className="text-xs text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear All
                </button>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-white/8">
              <div className="flex items-center gap-2.5 px-3 py-2 bg-white/6 rounded-xl border border-white/8">
                <Search className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search history…"
                  className="flex-1 bg-transparent outline-none text-sm text-zinc-300 placeholder:text-zinc-600"
                />
              </div>
            </div>

            {/* Grouped History List */}
            <div className="flex-1 overflow-y-auto py-2">
              {Object.keys(grouped).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
                  <Clock className="w-8 h-8 opacity-30" />
                  <p className="text-sm">No history yet</p>
                </div>
              ) : (
                Object.entries(grouped).map(([dateLabel, items]) => (
                  <div key={dateLabel} className="mb-2">
                    <p className="px-4 py-1 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
                      {dateLabel}
                    </p>
                    {items.map((entry) => (
                      <motion.button
                        key={entry.id}
                        whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                        onClick={() => { onNavigate(entry.url); onClose() }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                      >
                        <Globe className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-zinc-300 truncate">{entry.title || 'Untitled'}</p>
                          <p className="text-[10px] text-zinc-600 truncate">{entry.url}</p>
                        </div>
                        <span className="text-[10px] text-zinc-700 flex-shrink-0">
                          {new Date(entry.visitedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
