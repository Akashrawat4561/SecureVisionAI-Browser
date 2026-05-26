import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Command, Search, Globe, Plus, X } from 'lucide-react'
import { useTabStore } from '../store/tabStore'
import { cn } from '@securevision/ui'

interface CommandItem {
  id: string
  label: string
  subtitle?: string
  icon: React.ReactNode
  action: () => void
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const { tabs, openNewTab, switchTab } = useTabStore()

  const buildCommands = useCallback((): CommandItem[] => {
    const items: CommandItem[] = []

    // Open tabs
    tabs.forEach((tab) => {
      if (!query || tab.title.toLowerCase().includes(query.toLowerCase()) || tab.url.toLowerCase().includes(query.toLowerCase())) {
        items.push({
          id: `tab-${tab.id}`,
          label: tab.title || 'Untitled Tab',
          subtitle: tab.url,
          icon: <Globe className="w-4 h-4 text-blue-400" />,
          action: () => { switchTab(tab.id); onClose() }
        })
      }
    })

    // New Tab action
    if (query) {
      items.unshift({
        id: 'new-tab-search',
        label: `Search "${query}"`,
        subtitle: 'Open in new tab via DuckDuckGo',
        icon: <Search className="w-4 h-4 text-emerald-400" />,
        action: () => { openNewTab(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`); onClose() }
      })

      // URL navigation
      if (query.includes('.')) {
        items.unshift({
          id: 'new-tab-url',
          label: `Go to "${query}"`,
          subtitle: 'Navigate directly to URL',
          icon: <Plus className="w-4 h-4 text-purple-400" />,
          action: () => { openNewTab(query.startsWith('http') ? query : `https://${query}`); onClose() }
        })
      }
    }

    return items.slice(0, 10)
  }, [query, tabs, openNewTab, switchTab, onClose])

  const commands = buildCommands()

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, commands.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      commands[selectedIndex]?.action()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Palette Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="fixed top-1/4 left-1/2 -translate-x-1/2 w-full max-w-xl z-50"
          >
            <div className="bg-zinc-900/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8">
                <Command className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0) }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search tabs, navigate, or run commands…"
                  className="flex-1 bg-transparent outline-none text-sm text-zinc-200 placeholder:text-zinc-600"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Command Results */}
              <div className="py-1.5 max-h-80 overflow-y-auto">
                {commands.length === 0 ? (
                  <p className="text-center text-xs text-zinc-600 py-8">No results found</p>
                ) : (
                  commands.map((cmd, idx) => (
                    <motion.button
                      key={cmd.id}
                      onClick={cmd.action}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100',
                        idx === selectedIndex ? 'bg-white/10' : 'hover:bg-white/5'
                      )}
                    >
                      <div className="flex-shrink-0">{cmd.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-200 font-medium truncate">{cmd.label}</p>
                        {cmd.subtitle && (
                          <p className="text-xs text-zinc-600 truncate">{cmd.subtitle}</p>
                        )}
                      </div>
                      {idx === selectedIndex && (
                        <kbd className="text-[10px] text-zinc-600 bg-white/8 border border-white/10 rounded px-1.5 py-0.5 flex-shrink-0">↵</kbd>
                      )}
                    </motion.button>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-white/8 flex items-center gap-3 text-[10px] text-zinc-700">
                <span><kbd className="bg-white/8 px-1 rounded">↑↓</kbd> navigate</span>
                <span><kbd className="bg-white/8 px-1 rounded">↵</kbd> select</span>
                <span><kbd className="bg-white/8 px-1 rounded">esc</kbd> close</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
