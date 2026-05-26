import { create } from 'zustand'
import { AIMessage, AIConversation } from '@securevision/shared'

export type AIProvider = 'OPENAI' | 'GEMINI'

export interface AISidebarState {
  // Per-tab conversation map: tabId → conversation
  conversations: Record<string, AIConversation>
  // Global sidebar state
  isOpen: boolean
  width: number // px — resizable
  activeTabId: string | null
  activeProvider: AIProvider
  isStreaming: boolean
  streamingContent: string

  // Actions
  openSidebar: () => void
  closeSidebar: () => void
  toggleSidebar: () => void
  setWidth: (width: number) => void
  setActiveTab: (tabId: string) => void
  setProvider: (provider: AIProvider) => void

  // Conversation actions
  getOrCreateConversation: (tabId: string) => AIConversation
  addMessage: (tabId: string, message: AIMessage) => void
  clearConversation: (tabId: string) => void
  setStreamingContent: (content: string) => void
  setIsStreaming: (v: boolean) => void
}

function createConversation(tabId: string, provider: AIProvider): AIConversation {
  return {
    id: `conv_${tabId}_${Date.now()}`,
    tabId,
    provider,
    model: provider === 'OPENAI' ? 'gpt-4o-mini' : 'gemini-1.5-flash',
    messages: [],
    tokenCount: 0,
    updatedAt: new Date().toISOString(),
  }
}

export const useAIStore = create<AISidebarState>((set, get) => ({
  conversations: {},
  isOpen: false,
  width: 360,
  activeTabId: null,
  activeProvider: 'GEMINI',
  isStreaming: false,
  streamingContent: '',

  openSidebar: () => set({ isOpen: true }),
  closeSidebar: () => set({ isOpen: false }),
  toggleSidebar: () => set((s) => ({ isOpen: !s.isOpen })),
  setWidth: (width) => set({ width: Math.max(280, Math.min(600, width)) }),
  setActiveTab: (tabId) => {
    set({ activeTabId: tabId })
    get().getOrCreateConversation(tabId)
  },
  setProvider: (provider) => set({ activeProvider: provider }),

  getOrCreateConversation: (tabId) => {
    const existing = get().conversations[tabId]
    if (existing) return existing
    const conv = createConversation(tabId, get().activeProvider)
    set((s) => ({ conversations: { ...s.conversations, [tabId]: conv } }))
    return conv
  },

  addMessage: (tabId, message) => {
    set((s) => {
      const conv = s.conversations[tabId] || createConversation(tabId, s.activeProvider)
      const updated: AIConversation = {
        ...conv,
        messages: [...conv.messages, message],
        tokenCount: conv.tokenCount + Math.ceil(message.content.length / 4), // rough estimate
        updatedAt: new Date().toISOString(),
      }
      return { conversations: { ...s.conversations, [tabId]: updated } }
    })
  },

  clearConversation: (tabId) => {
    set((s) => {
      const conv = createConversation(tabId, s.activeProvider)
      return { conversations: { ...s.conversations, [tabId]: conv } }
    })
  },

  setStreamingContent: (content) => set({ streamingContent: content }),
  setIsStreaming: (v) => set({ isStreaming: v }),
}))
