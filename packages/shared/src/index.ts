export interface Tab {
  id: string
  url: string
  title: string
  isLoading: boolean
  isSuspended: boolean
  pinned: boolean
  favicon?: string
}

export interface Workspace {
  id: string
  name: string
  icon: string
  color: string
  tabs: Tab[]
  activeTabId?: string | null
  pinned: boolean
  createdAt: string
}

export interface BrowserSettings {
  incognito: boolean
  trackerBlockingEnabled: boolean
  fingerprintProtectionEnabled: boolean
  aiAutosyncEnabled: boolean
  tabSuspensionDelayMinutes: number
  theme: 'dark' | 'light' | 'system'
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

export interface AIConversation {
  id: string
  tabId: string
  provider: string
  model: string
  messages: AIMessage[]
  tokenCount: number
  updatedAt: string
}
