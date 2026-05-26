import { create } from 'zustand'
import { Tab } from '@securevision/shared'

interface TabStore {
  tabs: Tab[]
  activeTabId: string | null
  // Actions
  setTabs: (tabs: Tab[], activeTabId: string | null) => void
  openNewTab: (url?: string) => void
  closeTab: (tabId: string) => void
  switchTab: (tabId: string) => void
  navigateToUrl: (url: string) => void
  updateTabUrl: (tabId: string, url: string) => void
}

declare global {
  interface Window {
    secureVisionAPI: {
      browser: {
        openNewTab: (url: string) => void
        closeTab: (tabId: string) => void
        switchTab: (tabId: string) => void
        navigateToUrl: (url: string) => void
        updateBounds: (bounds: { x: number; y: number; width: number; height: number }) => void
      }
      telemetry: {
        logInfo: (context: string, message: string) => void
      }
      store: {
        get: (key: string) => Promise<any>
      }
      extensions: {
        get: () => Promise<any[]>
        toggle: (id: string) => Promise<boolean>
      }
      bookmarks: {
        get: (workspaceId: string) => Promise<any[]>
        add: (entry: any) => Promise<any>
        remove: (id: string) => void
      }
    }
  }
}

export const useTabStore = create<TabStore>((set) => ({
  tabs: [],
  activeTabId: null,

  setTabs: (tabs, activeTabId) => set({ tabs, activeTabId }),

  openNewTab: (url = 'securevision://newtab') => {
    window.secureVisionAPI?.browser?.openNewTab(url)
  },

  closeTab: (tabId) => {
    window.secureVisionAPI?.browser?.closeTab(tabId)
  },

  switchTab: (tabId) => {
    window.secureVisionAPI?.browser?.switchTab(tabId)
  },

  navigateToUrl: (url) => {
    window.secureVisionAPI?.browser?.navigateToUrl(url)
  },

  updateTabUrl: (tabId, url) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, url } : t)),
    })),
}))
