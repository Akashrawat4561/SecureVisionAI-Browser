import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Globe, PinIcon, ZapOff, Plus, Volume2, VolumeX, FolderOpen, Star, Puzzle, ChevronDown, ChevronRight, Trash2, ShieldCheck } from 'lucide-react'
import { Tab } from '@securevision/shared'
import { useTabStore } from '../store/tabStore'
import { cn } from '@securevision/ui'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'

interface TabItemProps {
  tab: Tab
  isActive: boolean
}
 
const TabItem: React.FC<TabItemProps> = ({ tab, isActive }) => {
  const { switchTab, closeTab } = useTabStore()
  const [isHovered, setIsHovered] = useState(false)
  const [isMuted, setIsMuted] = useState(false) // Demo state
 
  // Pinned arc-style square tab
  if (tab.pinned) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => switchTab(tab.id)}
        className={cn(
          'relative flex flex-col items-center justify-center w-10 h-10 rounded-xl cursor-pointer transition-all duration-200 select-none group',
          isActive
            ? 'bg-blue-500/20 text-blue-400 shadow-md border border-blue-500/30'
            : 'bg-white/5 border border-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200'
        )}
      >
        {tab.favicon && !tab.favicon.startsWith('data:image/png;base64,iVBOR') ? (
          <img src={tab.favicon} className="w-5 h-5 rounded-md" alt="" />
        ) : (
          <Globe className="w-5 h-5 opacity-80" />
        )}
        
        {/* Loading Indicator */}
        {tab.isLoading && (
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse ring-2 ring-zinc-950" />
        )}

        {/* Hover preview tooltip */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              className="absolute left-14 top-0 w-48 p-2 rounded-xl bg-zinc-800 border border-white/10 shadow-xl z-50 pointer-events-none"
            >
              <p className="text-xs font-bold text-white truncate mb-1">{tab.title}</p>
              <p className="text-[10px] text-zinc-400 truncate">{tab.url}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  // Normal Vertical Tab
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16, height: 0 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => switchTab(tab.id)}
      className={cn(
        'group relative flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-colors duration-150 select-none overflow-hidden',
        isActive
          ? 'bg-blue-500/15 text-white shadow-md border border-blue-500/20 font-semibold'
          : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'
      )}
    >
      {/* Active Indicator Line */}
      {isActive && (
        <motion.div layoutId="activeTabIndicator" className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-blue-500 rounded-r-full" />
      )}

      {/* Favicon */}
      <div className="w-4 h-4 flex-shrink-0 relative">
        {tab.isLoading ? (
          <svg className="animate-spin w-4 h-4 text-blue-400" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : tab.isSuspended ? (
          <ZapOff className="w-4 h-4 text-zinc-600" />
        ) : tab.favicon && !tab.favicon.startsWith('data:image/png;base64,iVBOR') ? (
          <img src={tab.favicon} className="w-4 h-4 rounded-sm" alt="" />
        ) : (
          <Globe className="w-4 h-4 opacity-60" />
        )}
      </div>
 
      {/* Tab Title */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <span className="text-xs font-medium truncate block w-full">
          {tab.isSuspended ? <span className="italic text-zinc-500">Suspended</span> : tab.title}
        </span>
      </div>
 
      {/* Actions (Audio / Close) */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Audio Icon for demo */}
        {Math.random() > 0.8 && (
          <button 
            onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
            className={`p-1 rounded-md transition-colors ${isMuted ? 'text-red-400 hover:bg-red-500/20' : 'text-zinc-400 hover:bg-white/10'}`}
          >
            {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
          </button>
        )}
        
        <button
          className="w-5 h-5 flex-shrink-0 rounded-md flex items-center justify-center bg-white/5 hover:bg-red-500/80 text-zinc-400 hover:text-white transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            closeTab(tab.id)
          }}
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  )
}
 
export const TabBar: React.FC = () => {
  const { tabs, openNewTab, activeTabId, navigateToUrl } = useTabStore()
 
  const pinnedTabs = tabs.filter((t) => t.pinned)
  const normalTabs = tabs.filter((t) => !t.pinned)

  // Bookmarks & Extensions states
  const [bookmarks, setBookmarks] = useState<any[]>([])
  const [extensions, setExtensions] = useState<any[]>([])
  const [bookmarksOpen, setBookmarksOpen] = useState(true)
  const [extensionsOpen, setExtensionsOpen] = useState(true)

  const loadBookmarks = async () => {
    try {
      const b = await window.secureVisionAPI?.bookmarks?.get('default')
      setBookmarks(b || [])
    } catch (e) {}
  }

  const loadExtensions = async () => {
    try {
      const ext = await window.secureVisionAPI?.extensions?.get()
      setExtensions(ext || [])
    } catch (e) {}
  }

  useEffect(() => {
    loadBookmarks()
    loadExtensions()
    
    // Poll bookmarks to sync dynamic star additions
    const timer = setInterval(loadBookmarks, 3000)
    return () => clearInterval(timer)
  }, [])

  const handleRemoveBookmark = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await window.secureVisionAPI?.bookmarks?.remove(id)
      loadBookmarks()
    } catch (e) {}
  }

  const handleToggleExtension = async (id: string) => {
    try {
      await window.secureVisionAPI?.extensions?.toggle(id)
      loadExtensions()
    } catch (e) {}
  }
 
  return (
    <aside
      className="w-[260px] h-full flex flex-col bg-zinc-950/85 backdrop-blur-2xl border-r border-white/5 shrink-0 shadow-2xl relative z-40"
      style={{ WebkitAppRegion: 'no-drag' } as any}
    >
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <WorkspaceSwitcher />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none flex flex-col gap-4 px-3 pb-4">
        
        {/* Pinned Tabs (Arc Style Squares) */}
        {pinnedTabs.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            <AnimatePresence>
              {pinnedTabs.map((tab) => (
                <TabItem key={tab.id} tab={tab} isActive={tab.id === activeTabId} />
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className="h-px w-full bg-white/5" />

        {/* Folders & Normal Tabs */}
        <div className="flex flex-col gap-0.5">
          <AnimatePresence>
            {normalTabs.map((tab) => (
              <TabItem key={tab.id} tab={tab} isActive={tab.id === activeTabId} />
            ))}
          </AnimatePresence>
        </div>

        {/* ── Collapsible Bookmarks Section ── */}
        <div className="flex flex-col">
          <button
            onClick={() => setBookmarksOpen(!bookmarksOpen)}
            className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors text-[10px] font-extrabold uppercase tracking-wider"
          >
            <span className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500/80 fill-amber-500/20" />
              Bookmarks ({bookmarks.length})
            </span>
            {bookmarksOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
          
          <AnimatePresence>
            {bookmarksOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden flex flex-col gap-0.5 pl-2 mt-1"
              >
                {bookmarks.length === 0 ? (
                  <p className="text-[10px] text-zinc-600 italic px-2 py-1">No bookmarked sites yet.</p>
                ) : (
                  bookmarks.map((bm) => (
                    <div
                      key={bm.id}
                      onClick={() => navigateToUrl(bm.url)}
                      className="group flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer select-none"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Globe className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="truncate">{bm.title}</span>
                      </span>
                      <button
                        onClick={(e) => handleRemoveBookmark(bm.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-all shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Collapsible Security Extensions Section ── */}
        <div className="flex flex-col">
          <button
            onClick={() => setExtensionsOpen(!extensionsOpen)}
            className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors text-[10px] font-extrabold uppercase tracking-wider"
          >
            <span className="flex items-center gap-1.5">
              <Puzzle className="w-3.5 h-3.5 text-blue-500/80" />
              Secure Extensions ({extensions.length})
            </span>
            {extensionsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
          
          <AnimatePresence>
            {extensionsOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden flex flex-col gap-1.5 pl-2 mt-1"
              >
                {extensions.map((ext) => (
                  <div
                    key={ext.id}
                    className="flex flex-col p-2 bg-white/5 border border-white/5 rounded-xl hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                        {ext.name}
                        {ext.isSigned && (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" title="Verified signed extension" />
                        )}
                      </span>
                      
                      {/* Premium Neon Switch Toggler */}
                      <button
                        onClick={() => handleToggleExtension(ext.id)}
                        className={cn(
                          'w-7 h-4 rounded-full p-0.5 transition-colors focus:outline-none shrink-0 duration-200',
                          ext.enabled ? 'bg-blue-500' : 'bg-zinc-800'
                        )}
                      >
                        <div
                          className={cn(
                            'w-3 h-3 rounded-full bg-white transition-transform duration-200',
                            ext.enabled ? 'translate-x-3' : 'translate-x-0'
                          )}
                        />
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-normal">{ext.description}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {ext.permissions.map((p: string) => (
                        <span key={p} className="text-[8px] bg-blue-500/10 text-blue-400 px-1 py-0.5 rounded uppercase font-bold tracking-wider">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </aside>
  )
}
