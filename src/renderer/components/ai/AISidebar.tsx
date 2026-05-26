import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, StickyNote, X, ChevronRight, Settings } from 'lucide-react'
import { useAIStore } from '../../store/aiStore'
import { useTabStore } from '../../store/tabStore'
import { ChatMessage, StreamingBubble } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { SmartNotes } from './SmartNotes'
import { usePageSummarizer } from '../../hooks/usePageSummarizer'
import { cn } from '@securevision/ui'

type SidebarTab = 'chat' | 'notes'

export const AISidebar: React.FC = () => {
  const {
    isOpen,
    width,
    closeSidebar,
    setWidth,
    activeTabId: aiTabId,
    conversations,
    isStreaming,
    streamingContent,
    activeProvider
  } = useAIStore()
  
  const { tabs, activeTabId: browserTabId } = useTabStore()
  const [activeView, setActiveView] = useState<SidebarTab>('chat')
  const { summarize, isSummarizing } = usePageSummarizer()
  const { sendMessage } = useAIInference()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Keep AI active tab synced with browser active tab
  useEffect(() => {
    if (browserTabId) {
      useAIStore.getState().setActiveTab(browserTabId)
    }
  }, [browserTabId])

  const activeTab = tabs.find(t => t.id === browserTabId)
  const conversation = aiTabId ? conversations[aiTabId] : null
  const messages = conversation?.messages || []

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (activeView === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isStreaming, streamingContent, activeView])

  const handleSend = async (text: string) => {
    if (!aiTabId) return
    const pageContext = await window.secureVisionAPI?.browser?.getPageContent?.()
    await sendMessage(aiTabId, text, typeof pageContext === 'string' ? pageContext : undefined)
  }

  if (!isOpen) return null

  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      style={{ width }}
      className="flex flex-col h-full bg-zinc-900/95 backdrop-blur-2xl border-l border-white/10 shrink-0 shadow-2xl relative"
    >
      {/* Resizer Handle */}
      <div 
        className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-blue-500/50 transition-colors z-10"
        onMouseDown={(e) => {
          const startX = e.clientX
          const startWidth = width
          
          const onMouseMove = (moveEvent: MouseEvent) => {
            const delta = startX - moveEvent.clientX
            setWidth(startWidth + delta)
          }
          const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
          }
          
          document.addEventListener('mousemove', onMouseMove)
          document.addEventListener('mouseup', onMouseUp)
        }}
      />

      {/* Header */}
      <header className="flex flex-col px-3 py-2 border-b border-white/8 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center">
              <Bot className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs font-semibold text-zinc-200">SecureVision AI</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-white/10 text-zinc-400 border border-white/5 uppercase">
              {activeProvider}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors">
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button onClick={closeSidebar} className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-white/5 p-0.5 rounded-lg">
          <button
            onClick={() => setActiveView('chat')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium rounded-md transition-all',
              activeView === 'chat' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            <Bot className="w-3 h-3" /> Chat
          </button>
          <button
            onClick={() => setActiveView('notes')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium rounded-md transition-all',
              activeView === 'notes' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            <StickyNote className="w-3 h-3" /> Notes
          </button>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        <AnimatePresence mode="wait">
          {activeView === 'chat' ? (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col h-full"
            >
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-3 px-4 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-2">
                      <Bot className="w-6 h-6 text-zinc-600" />
                    </div>
                    <p className="text-sm font-medium text-zinc-300">How can I help you today?</p>
                    <p className="text-xs text-zinc-600">I can summarize pages, check for security risks, or answer general questions.</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <ChatMessage key={`${msg.role}-${idx}`} message={msg} />
                  ))
                )}
                {isStreaming && <StreamingBubble content={streamingContent} />}
                <div ref={messagesEndRef} className="h-1" />
              </div>
              <ChatInput onSend={handleSend} isStreaming={isStreaming || isSummarizing} disabled={!aiTabId} />
            </motion.div>
          ) : (
            <motion.div
              key="notes"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 h-full"
            >
              {aiTabId && activeTab ? (
                <SmartNotes tabId={aiTabId} pageUrl={activeTab.url} />
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-600 text-xs">
                  No active tab
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  )
}

// Needed to avoid circular dependency in AISidebar, moving useAIInference import
import { useAIInference } from '../../hooks/useAIInference'
