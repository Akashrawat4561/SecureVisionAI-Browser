import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, ShieldAlert, ShieldCheck, Search, RefreshCw, X, ArrowLeft, ArrowRight, Lock, Unlock, Zap, Star, Globe } from 'lucide-react'
import { useTabStore } from '../store/tabStore'
import { cn } from '@securevision/ui'

type SecurityLevel = 'secure' | 'insecure' | 'unknown' | 'dangerous'

function getSecurityLevel(url: string): SecurityLevel {
  if (url.includes('scam') || url.includes('phishing')) return 'dangerous'
  if (url.startsWith('https://')) return 'secure'
  if (url.startsWith('http://')) return 'insecure'
  return 'unknown'
}

function isSearchQuery(input: string): boolean {
  return !input.includes('.') || input.includes(' ')
}

function buildNavigationUrl(input: string): string {
  if (isSearchQuery(input)) {
    return `https://duckduckgo.com/?q=${encodeURIComponent(input)}`
  }
  if (!input.startsWith('http://') && !input.startsWith('https://')) {
    return `https://${input}`
  }
  return input
}

export const AddressBar: React.FC = () => {
  const { tabs, activeTabId, updateTabUrl, navigateToUrl } = useTabStore()
  const activeTab = tabs.find((t) => t.id === activeTabId)

  const [inputValue, setInputValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const displayUrl = activeTab?.url || ''
  const security = getSecurityLevel(displayUrl)

  // Bookmarking states & checking
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [bookmarkList, setBookmarkList] = useState<any[]>([])

  const checkBookmarkState = useCallback(async () => {
    if (!displayUrl) return
    try {
      const b = await window.secureVisionAPI?.bookmarks?.get('default')
      const exists = b?.some((item: any) => item.url === displayUrl)
      setIsBookmarked(!!exists)
      setBookmarkList(b || [])
    } catch (e) {}
  }, [displayUrl])

  useEffect(() => {
    checkBookmarkState()
  }, [checkBookmarkState, displayUrl])

  const handleToggleBookmark = async () => {
    if (!displayUrl || !activeTab) return
    try {
      if (isBookmarked) {
        const item = bookmarkList.find((item: any) => item.url === displayUrl)
        if (item) {
          await window.secureVisionAPI?.bookmarks?.remove(item.id)
        }
      } else {
        await window.secureVisionAPI?.bookmarks?.add({
          url: displayUrl,
          title: activeTab.title || displayUrl,
          workspaceId: 'default'
        })
      }
      checkBookmarkState()
    } catch (e) {}
  }

  // Demo AI Score based on URL
  const getAiScore = (level: SecurityLevel) => {
    if (level === 'secure') return { score: 98, color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
    if (level === 'dangerous') return { score: 12, color: 'text-red-400', bg: 'bg-red-500/10' }
    if (level === 'insecure') return { score: 45, color: 'text-orange-400', bg: 'bg-orange-500/10' }
    return { score: 85, color: 'text-blue-400', bg: 'bg-blue-500/10' }
  }
  const aiStats = getAiScore(security)

  const handleFocus = () => {
    setIsFocused(true)
    setInputValue(displayUrl)
    setTimeout(() => inputRef.current?.select(), 50)
  }

  const handleBlur = () => {
    // Delay hiding/final clearing so click handlers on the suggestions
    // (which run after blur) can still read `inputValue`.
    setTimeout(() => {
      setIsFocused(false)
      setInputValue('')
    }, 150)
  }

  const handleNavigate = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && activeTabId && inputValue.trim()) {
      const url = buildNavigationUrl(inputValue.trim())
      try {
        updateTabUrl(activeTabId, url)
        if (typeof navigateToUrl === 'function') {
          navigateToUrl(url)
        } else if (window?.secureVisionAPI?.browser?.navigateToUrl) {
          window.secureVisionAPI.browser.navigateToUrl(url)
        } else {
          console.error('[AddressBar] navigateToUrl not available')
        }
      } catch (err) {
        console.error('[AddressBar] Navigation failed:', err)
        try {
          window?.secureVisionAPI?.telemetry?.logInfo?.('AddressBar', 'Navigation failed: ' + String(err))
        } catch {}
      }
      inputRef.current?.blur()
      setIsFocused(false)
    }
    if (e.key === 'Escape') {
      inputRef.current?.blur()
      setIsFocused(false)
    }
  }, [inputValue, activeTabId, updateTabUrl])

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 h-full relative">
      {/* Navigation Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors disabled:opacity-30">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors disabled:opacity-30">
          <ArrowRight className="w-4 h-4" />
        </button>
        <button className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Omnibox */}
      <motion.div
        layout
        className={cn(
          'flex-1 flex items-center h-8 rounded-xl border transition-all duration-300 relative group',
          isFocused
            ? 'bg-zinc-900 border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/20'
            : security === 'dangerous'
              ? 'bg-red-500/10 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
              : 'bg-zinc-900/50 border-white/5 hover:bg-zinc-800 hover:border-white/15'
        )}
      >
        {/* Left Icon (Lock / Search) */}
        <div className="pl-3 pr-2 flex items-center justify-center shrink-0">
          <AnimatePresence mode="wait">
            {isFocused ? (
              <motion.div key="search" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <Search className="w-3.5 h-3.5 text-blue-400" />
              </motion.div>
            ) : security === 'secure' ? (
              <motion.div key="lock" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-md">
                <Lock className="w-3 h-3" />
              </motion.div>
            ) : security === 'insecure' ? (
              <motion.div key="unlock" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded-md">
                <Unlock className="w-3 h-3" />
              </motion.div>
            ) : security === 'dangerous' ? (
              <motion.div key="danger" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded-md">
                <ShieldAlert className="w-3 h-3" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Dangerous</span>
              </motion.div>
            ) : (
              <motion.div key="globe" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Search className="w-3.5 h-3.5 text-zinc-500" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={isFocused ? inputValue : displayUrl}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleNavigate}
          placeholder="Search DuckDuckGo or type a URL..."
          spellCheck={false}
          className="flex-1 bg-transparent outline-none text-[13px] text-zinc-100 placeholder:text-zinc-500 min-w-0 font-medium tracking-wide h-full"
        />

        {/* Right Actions (Clear / AI Score) */}
        <div className="pr-1.5 pl-2 flex items-center gap-1.5 shrink-0 h-full">
          {isFocused && inputValue ? (
            <button 
              onMouseDown={(e) => { e.preventDefault(); setInputValue(''); inputRef.current?.focus() }}
              className="p-1 rounded-md text-zinc-400 hover:bg-white/10 hover:text-white transition-colors mr-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : !isFocused && displayUrl && (
            <div className="flex items-center gap-1.5 h-full">
              <button 
                onClick={handleToggleBookmark}
                className={cn(
                  'p-1 rounded-lg hover:bg-white/10 transition-colors duration-200 shrink-0',
                  isBookmarked ? 'text-amber-400 hover:text-amber-300' : 'text-zinc-500 hover:text-zinc-300'
                )}
                title={isBookmarked ? 'Remove Bookmark' : 'Bookmark this page'}
              >
                <Star className={cn('w-3.5 h-3.5', isBookmarked ? 'fill-current' : 'fill-none')} />
              </button>
              
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`flex items-center gap-1 px-1.5 py-1 rounded-md ${aiStats.bg} ${aiStats.color} border border-current/20 cursor-default shrink-0`}
                title="SecureVision AI Trust Score"
              >
                <Zap className="w-3 h-3" />
                <span className="text-[10px] font-black font-mono">{aiStats.score}</span>
              </motion.div>
            </div>
          )}
        </div>

        {/* Search Suggestions Dropdown Overlay */}
        <AnimatePresence>
          {isFocused && inputValue.trim().length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-2 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col"
            >
              <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-black/20">
                AI Search & Suggestions
              </div>
              <button 
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors border-b border-white/5"
                onClick={() => {
                  const url = buildNavigationUrl(inputValue)
                  updateTabUrl(activeTabId!, url)
                  navigateToUrl(url)
                  setIsFocused(false)
                }}
              >
                <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Search className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{inputValue}</p>
                  <p className="text-[10px] text-blue-400 mt-0.5">Secure Search</p>
                </div>
              </button>
              
              {/* Dummy History Suggestion */}
              <button className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors">
                <div className="w-6 h-6 rounded-md bg-purple-500/10 flex items-center justify-center shrink-0">
                  <Globe className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-300 truncate">{inputValue}.com</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">From your browsing history</p>
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
