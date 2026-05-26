import React, { useEffect, useState, useCallback, useRef } from 'react'
import { TabBar } from './components/TabBar'
import { AddressBar } from './components/AddressBar'
import { CommandPalette } from './components/CommandPalette'
import { AISidebar } from './components/ai/AISidebar'
import { SecuritySidebar } from './components/SecuritySidebar'
import { FocusModeOverlay } from './components/productivity/FocusMode'
import { ReadingModeOverlay } from './components/productivity/ReadingMode'
import { ResearchBoard } from './components/productivity/ResearchBoard'
import { DevPanel } from './components/developer/DevPanel'
import { useTabStore } from './store/tabStore'
import { useAIStore } from './store/aiStore'
import { ShieldCheck, Bot, Focus, BookOpen, LayoutGrid, Code2, Clock, Settings, Shield, Plus } from 'lucide-react'
import { Dashboard } from './components/Dashboard'
import { SettingsPanel } from './components/SettingsPanel'
import { HistoryPanel } from './components/HistoryPanel'

// IPC bridge typing — synced from preload
declare global {
  interface Window {
    electronAPI?: {
      onSyncTabs: (callback: (data: { tabs: any[]; activeTabId: string | null }) => void) => void
    }
  }
}

export default function App() {
  const { tabs, setTabs, activeTabId } = useTabStore()
  const { toggleSidebar, isOpen: isAISidebarOpen } = useAIStore()
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const viewportRef = useRef<HTMLDivElement>(null)
  
  // Security overlays
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isGhostMode, setIsGhostMode] = useState(false)
  const [isSecuritySidebarOpen, setIsSecuritySidebarOpen] = useState(false)
  
  // Productivity Modes
  const [isFocusModeActive, setIsFocusModeActive] = useState(false)
  const [isReadingModeOpen, setIsReadingModeOpen] = useState(false)
  const [isResearchBoardOpen, setIsResearchBoardOpen] = useState(false)

  // Developer Platform
  const [isDevPanelOpen, setIsDevPanelOpen] = useState(false)

  const handleSearchOrNavigate = (urlOrQuery: string) => {
    let targetUrl = urlOrQuery
    if (!urlOrQuery.includes('.') || urlOrQuery.includes(' ')) {
      targetUrl = `https://duckduckgo.com/?q=${encodeURIComponent(urlOrQuery)}`
    } else if (!urlOrQuery.startsWith('http://') && !urlOrQuery.startsWith('https://')) {
      targetUrl = `https://${urlOrQuery}`
    }
    window.secureVisionAPI?.browser?.openNewTab(targetUrl)
  }

  // Listen for tab state updates pushed from Main Process
  useEffect(() => {
    window.electronAPI?.onSyncTabs(({ tabs, activeTabId }) => {
      setTabs(tabs, activeTabId)
    })
  }, [setTabs])

  // Global Keyboard Shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const modKey = e.metaKey || e.ctrlKey

    // Cmd+K / Ctrl+K — Command Palette
    if (modKey && e.key === 'k') {
      e.preventDefault()
      setIsPaletteOpen((prev) => !prev)
    }

    // Cmd+T / Ctrl+T — New Tab
    if (modKey && e.key === 't') {
      e.preventDefault()
      window.secureVisionAPI?.browser?.openNewTab('securevision://newtab')
    }

    // Cmd+W / Ctrl+W — Close Tab
    // handled via tab store close action from active tab id
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const syncViewportBounds = useCallback(() => {
    if (!viewportRef.current || !activeTabId) return
    const activeTab = tabs.find(t => t.id === activeTabId)
    
    if (activeTab?.url === 'securevision://newtab') {
      // Hide BrowserView for new tab
      window.secureVisionAPI?.browser?.updateBounds({ x: -9999, y: -9999, width: 0, height: 0 })
      return
    }

    const rect = viewportRef.current.getBoundingClientRect()
    // Convert to screen/window coordinates for Electron BrowserView
    window.secureVisionAPI?.browser?.updateBounds({
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    })
  }, [activeTabId, tabs])

  useEffect(() => {
    // Sync initially and on any layout change
    syncViewportBounds()
    
    // Set up resize observer for fluid updates
    const observer = new ResizeObserver(() => syncViewportBounds())
    if (viewportRef.current) observer.observe(viewportRef.current)

    window.addEventListener('resize', syncViewportBounds)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', syncViewportBounds)
    }
  }, [syncViewportBounds, tabs, isAISidebarOpen, isSecuritySidebarOpen, isDevPanelOpen, isFocusModeActive])

  const isWindows = typeof window !== 'undefined' && 
    (navigator.userAgent.includes('Windows') || navigator.platform.toLowerCase().includes('win'))

  return (
    <div className={`w-screen h-screen flex flex-col font-sans overflow-hidden transition-all duration-500 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${
      isGhostMode
        ? 'from-purple-950/80 via-zinc-950 to-black text-purple-100'
        : 'from-zinc-900 via-zinc-950 to-black text-white'
    }`}>
 
      {/* ── Title Bar Chrome ── */}
      <header
        className="h-11 flex items-center bg-zinc-950/70 backdrop-blur-xl border-b border-white/5 shrink-0 z-30 shadow-md"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        {/* Adaptive Platform Header Controls */}
        {isWindows ? (
          <div className="flex items-center gap-2 pl-4 pr-2 shrink-0 select-none" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <span className={`text-xs font-black bg-clip-text text-transparent tracking-widest bg-gradient-to-r ${isGhostMode ? 'from-purple-400 to-indigo-400' : 'from-blue-400 to-indigo-400'}`}>
              {isGhostMode ? '🛡️ GHOST SESSION' : '🛡️ SECUREVISION AI'}
            </span>
          </div>
        ) : (
          /* Traffic-light spacer (macOS) */
          <div className="w-20 flex gap-1.5 pl-4 shrink-0" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <div className="w-3 h-3 rounded-full bg-red-500/70 hover:bg-red-500 transition-colors" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70 hover:bg-yellow-500 transition-colors" />
            <div className="w-3 h-3 rounded-full bg-green-500/70 hover:bg-green-500 transition-colors" />
          </div>
        )}
 
        {/* Address Bar — takes up all remaining header space */}
        <div className="flex-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <AddressBar />
        </div>
 
        {/* AI Shield / Ghost Session Indicator */}
        {isGhostMode ? (
          <div
            className="flex items-center gap-1.5 px-4 text-[10px] text-purple-400 font-black tracking-wider uppercase shrink-0"
            style={{ WebkitAppRegion: 'no-drag' } as any}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <span>Ghost Session</span>
          </div>
        ) : (
          <div
            className="flex items-center gap-1.5 px-4 text-[10px] text-emerald-400 font-bold tracking-wider uppercase shrink-0"
            style={{ WebkitAppRegion: 'no-drag' } as any}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Protected</span>
          </div>
        )}
        
        {/* Productivity Tools & Quick Modals */}
        <div className="flex items-center gap-2 px-2 border-r border-white/5 shrink-0" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button
            onClick={() => window.secureVisionAPI?.browser?.openNewTab('securevision://newtab')}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="New Tab"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="History"
          >
            <Clock className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsReadingModeOpen(true)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Reading Mode"
          >
            <BookOpen className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsResearchBoardOpen(true)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Research Board"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsFocusModeActive(!isFocusModeActive)}
            className={`p-1.5 rounded-lg transition-colors ${isFocusModeActive ? 'text-emerald-400 bg-emerald-400/10' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
            title="Focus Mode"
          >
            <Focus className="w-4 h-4" />
          </button>
        </div>
 
        {/* Developer Platform Toggle */}
        <div className="flex items-center px-2 border-r border-white/5 shrink-0" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button
            onClick={() => setIsDevPanelOpen(!isDevPanelOpen)}
            className={`p-1.5 rounded-lg transition-colors ${isDevPanelOpen ? 'text-purple-400 bg-purple-400/10' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
            title="Developer Tools"
          >
            <Code2 className="w-4 h-4" />
          </button>
        </div>
 
        {/* Security Sidebar Toggle */}
        <div className="flex items-center px-2 shrink-0" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button
            onClick={() => setIsSecuritySidebarOpen(p => !p)}
            className={`p-1.5 rounded-lg transition-colors border flex items-center gap-1.5 shadow-sm ${
              isSecuritySidebarOpen
                ? 'bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 border-orange-500/30'
                : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border-red-500/20'
            }`}
            title="Security Suite"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">Security</span>
          </button>
        </div>

        {/* AI Sidebar Toggle */}
        <div className="flex items-center px-4 shrink-0" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-colors border border-blue-500/20 flex items-center gap-1.5 shadow-sm"
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">Ask AI</span>
          </button>
        </div>

        {/* Windows Caption Controls Reserve Spacer */}
        {isWindows && <div className="w-[135px] shrink-0 h-full" />}
      </header>

      {/* ── Main Workspace ── */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* ── Vertical Tab Sidebar ── */}
        <TabBar />

        {/* ── BrowserView Host Plane ── */}
        {/* 
          NOTE: The actual Chromium BrowserView is a native layer rendered
          BELOW the React UI by Electron. The React shell merely controls its
          position and visibility via IPC. This div defines the bounds sent to
          the Main process BrowserViewManager.
        */}
        <div
          id="browser-viewport"
          ref={viewportRef}
          className="flex-1 relative bg-zinc-900"
        >
          {/* Security Telemetry & AI Deepfake / Phishing Dashboard */}
          {(tabs.length === 0 || tabs.find(t => t.id === activeTabId)?.url === 'securevision://newtab') && (
            <Dashboard
              onSearch={handleSearchOrNavigate}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenHistory={() => setIsHistoryOpen(true)}
              isGhostMode={isGhostMode}
              onToggleGhostMode={setIsGhostMode}
            />
          )}
        </div>

        {/* ── AI Sidebar ── */}
        <AISidebar />

        {/* ── Security Sidebar ── */}
        <SecuritySidebar
          isOpen={isSecuritySidebarOpen}
          onClose={() => setIsSecuritySidebarOpen(false)}
          isGhostMode={isGhostMode}
          onToggleGhostMode={setIsGhostMode}
        />
      </div>

      {/* ── Productivity Overlays ── */}
      <FocusModeOverlay isActive={isFocusModeActive} onToggle={() => setIsFocusModeActive(false)} />
      <ReadingModeOverlay isOpen={isReadingModeOpen} onClose={() => setIsReadingModeOpen(false)} />
      <ResearchBoard isOpen={isResearchBoardOpen} onClose={() => setIsResearchBoardOpen(false)} />

      {/* ── Developer Platform ── */}
      <DevPanel isOpen={isDevPanelOpen} onClose={() => setIsDevPanelOpen(false)} />

      {/* ── Settings & History Panels ── */}
      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <HistoryPanel isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} onNavigate={handleSearchOrNavigate} />

      {/* ── Command Palette Modal ── */}
      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
    </div>
  )
}
