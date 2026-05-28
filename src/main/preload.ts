import { contextBridge, ipcRenderer } from 'electron'

// Validated channel allowlist — NEVER expose dynamic channels
const ALLOWED_SEND_CHANNELS = [
  'log-info',
  'log-security',
  'open-new-tab',
  'close-tab',
  'switch-tab',
  'navigate-active-tab',
  'update-view-bounds',
  'history-clear',
  'history-remove',
  'bookmarks-remove',
  'workspaces-set-active',
  'workspaces-remove',
  'workspaces-rename',
  'settings-update',
] as const

const ALLOWED_INVOKE_CHANNELS = [
  'secure-store-get',
  'secure-store-update-theme',
  'secure-store-update-ai-settings',
  'history-get-recent',
  'history-search',
  'bookmarks-get',
  'bookmarks-search',
  'bookmarks-add',
  'extensions-get',
  'extensions-toggle',
  'workspaces-get-all',
  'workspaces-get-active',
  'workspaces-create',
  'settings-get-all',
  'get-page-content',
] as const

const ALLOWED_RECEIVE_CHANNELS = [
  'sync-tabs',
  'security-alert',
  'ai-suggestion',
  'open-command-palette',
  'focus-address-bar',
] as const

contextBridge.exposeInMainWorld('secureVisionAPI', {
  telemetry: {
    logInfo: (context: string, message: string) =>
      ipcRenderer.send('log-info', { context, message }),
    logSecurity: (context: string, message: string, data: unknown) =>
      ipcRenderer.send('log-security', { context, message, data }),
  },
  store: {
    get: (key: string) => ipcRenderer.invoke('secure-store-get', key),
    // Discrete typed setters — no generic set(key, value) allowed
    updateTheme: (theme: 'dark' | 'light' | 'system') =>
      ipcRenderer.invoke('secure-store-update-theme', { theme }),
    updateAISettings: (settings: Record<string, unknown>) =>
      ipcRenderer.invoke('secure-store-update-ai-settings', { settings }),
  },
  browser: {
    openNewTab: (url: string) => ipcRenderer.send('open-new-tab', url),
    closeTab: (tabId: string) => ipcRenderer.send('close-tab', tabId),
    switchTab: (tabId: string) => ipcRenderer.send('switch-tab', tabId),
    navigateToUrl: (url: string) => ipcRenderer.send('navigate-active-tab', url),
    updateBounds: (bounds: { x: number; y: number; width: number; height: number }) =>
      ipcRenderer.send('update-view-bounds', bounds),
    getPageContent: () => ipcRenderer.invoke('get-page-content'),
  },
  extensions: {
    get: () => ipcRenderer.invoke('extensions-get'),
    toggle: (id: string) => ipcRenderer.invoke('extensions-toggle', id),
  },
  bookmarks: {
    get: (workspaceId: string) => ipcRenderer.invoke('bookmarks-get', workspaceId),
    add: (entry: any) => ipcRenderer.invoke('bookmarks-add', entry),
    remove: (id: string) => ipcRenderer.send('bookmarks-remove', id),
  },
})

// Separate safe listener bridge
contextBridge.exposeInMainWorld('electronAPI', {
  onSyncTabs: (callback: (data: unknown) => void) => {
    ipcRenderer.on('sync-tabs', (_event, data) => callback(data))
  },
  onSecurityAlert: (callback: (data: unknown) => void) => {
    ipcRenderer.on('security-alert', (_event, data) => callback(data))
  },
  send: (channel: string, ...args: any[]) => {
    if (ALLOWED_SEND_CHANNELS.includes(channel as any)) {
      ipcRenderer.send(channel, ...args)
    } else {
      console.error(`[IPC] Blocked unauthorized send: ${channel}`)
    }
  },
  invoke: (channel: string, ...args: any[]) => {
    if (ALLOWED_INVOKE_CHANNELS.includes(channel as any)) {
      return ipcRenderer.invoke(channel, ...args)
    }
    console.error(`[IPC] Blocked unauthorized invoke: ${channel}`)
    return Promise.reject(`Unauthorized invoke: ${channel}`)
  },
  on: (channel: string, callback: (...args: any[]) => void) => {
    if (ALLOWED_RECEIVE_CHANNELS.includes(channel as any)) {
      const subscription = (_event: any, ...args: any[]) => callback(...args)
      ipcRenderer.on(channel, subscription)
      return () => ipcRenderer.removeListener(channel, subscription)
    }
    console.error(`[IPC] Blocked unauthorized on: ${channel}`)
  }
})
