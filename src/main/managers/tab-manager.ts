import { BrowserWindow, ipcMain } from 'electron'
import { Tab } from '@securevision/shared'
import { BrowserViewManager } from './browser-view-manager'
import { workspaceManager } from './workspace-manager'
import { historyManager } from './history-manager'

export class TabManager {
  private tabs: Map<string, Tab> = new Map()
  private activeTabId: string | null = null
  private currentWorkspaceId: string | null = null
  private mainWindow: BrowserWindow
  private viewManager: BrowserViewManager
  private readonly SUSPENSION_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes

  // Tracks the last active timestamp for background tabs
  private tabActivityTimers: Map<string, NodeJS.Timeout> = new Map()

  constructor(mainWindow: BrowserWindow, viewManager: BrowserViewManager) {
    this.mainWindow = mainWindow
    this.viewManager = viewManager

    this.loadWorkspaceTabs()
    this.registerIpcHandlers()
  }

  private loadWorkspaceTabs() {
    // 1. Destroy any existing BrowserViews to avoid leaks
    for (const tabId of this.tabs.keys()) {
      this.viewManager.destroyView(tabId)
      this.clearSuspensionTimer(tabId)
    }
    this.tabs.clear()

    // 2. Load tabs from active workspace
    const activeWs = workspaceManager.getActive()
    if (activeWs) {
      this.currentWorkspaceId = activeWs.id
      if (activeWs.tabs) {
        activeWs.tabs.forEach((tab) => {
          tab.isLoading = false // Reset loading state on startup
          this.tabs.set(tab.id, tab)
        })
        this.activeTabId = activeWs.activeTabId || (activeWs.tabs[0]?.id ?? null)
      } else {
        this.activeTabId = null
      }
    } else {
      this.currentWorkspaceId = null
      this.activeTabId = null
    }

    // 3. Create BrowserView for active tab on startup if it exists and is not suspended
    if (this.activeTabId && !this.tabs.get(this.activeTabId)?.isSuspended && this.currentWorkspaceId) {
      const activeTab = this.tabs.get(this.activeTabId)!
      const view = this.viewManager.getOrCreateView(this.activeTabId, this.currentWorkspaceId)
      this.setupTabListeners(this.activeTabId, view.webContents)
      if (activeTab.url !== 'securevision://newtab') {
        view.webContents.loadURL(activeTab.url)
      }
    }
  }

  private saveActiveWorkspaceTabs() {
    if (this.currentWorkspaceId) {
      workspaceManager.saveWorkspaceTabs(
        this.currentWorkspaceId,
        Array.from(this.tabs.values()),
        this.activeTabId
      )
    }
  }

  public switchWorkspace(workspaceId: string) {
    // 1. Save current tabs of old workspace
    this.saveActiveWorkspaceTabs()

    // 2. Hide active BrowserView of old workspace
    if (this.activeTabId) {
      const activeView = this.viewManager.getActiveView(this.activeTabId)
      if (activeView) {
        this.mainWindow.removeBrowserView(activeView)
      }
    }

    // 3. Load tabs of new workspace
    this.loadWorkspaceTabs()

    // 4. Send updated tabs list to the renderer
    this.syncTabsToRenderer()
  }

  private registerIpcHandlers() {
    ipcMain.on('open-new-tab', (event, url) => this.createTab(url))
    ipcMain.on('close-tab', (event, tabId) => this.closeTab(tabId))
    ipcMain.on('switch-tab', (event, tabId) => this.switchTab(tabId))
    ipcMain.on('navigate-active-tab', (event, url) => {
      if (this.activeTabId && this.currentWorkspaceId) {
        const tab = this.tabs.get(this.activeTabId)
        if (tab) {
          tab.url = url
          tab.isLoading = true
          const view = this.viewManager.getOrCreateView(this.activeTabId, this.currentWorkspaceId)
          this.setupTabListeners(this.activeTabId, view.webContents)
          view.webContents.loadURL(url)
          this.saveActiveWorkspaceTabs()
          this.syncTabsToRenderer()
        }
      }
    })

    // Resize the active BrowserView when the renderer reports new layout bounds
    ipcMain.on('update-view-bounds', (event, bounds: { x: number; y: number; width: number; height: number }) => {
      if (this.activeTabId && this.currentWorkspaceId) {
        this.viewManager.attachView(this.activeTabId, this.currentWorkspaceId, bounds)
      }
    })
  }

  private setupTabListeners(tabId: string, webContents: any) {
    if (webContents._hasSecureVisionListeners) return
    webContents._hasSecureVisionListeners = true

    webContents.on('did-start-loading', () => {
      const tab = this.tabs.get(tabId)
      if (tab) {
        tab.isLoading = true
        this.saveActiveWorkspaceTabs()
        this.syncTabsToRenderer()
      }
    })

    webContents.on('did-stop-loading', () => {
      const tab = this.tabs.get(tabId)
      if (tab) {
        tab.isLoading = false
        const currentUrl = webContents.getURL()
        if (!(tab.url === 'securevision://newtab' && currentUrl === 'about:blank')) {
          tab.url = currentUrl
        }
        this.saveActiveWorkspaceTabs()
        this.syncTabsToRenderer()
      }
    })

    webContents.on('page-title-updated', (event: any, title: string) => {
      const tab = this.tabs.get(tabId)
      if (tab) {
        tab.title = title || tab.url
        this.saveActiveWorkspaceTabs()
        this.syncTabsToRenderer()
      }
    })

    webContents.on('page-favicon-updated', (event: any, favicons: string[]) => {
      const tab = this.tabs.get(tabId)
      if (tab && favicons && favicons.length > 0) {
        tab.favicon = favicons[0]
        this.saveActiveWorkspaceTabs()
        this.syncTabsToRenderer()
      }
    })

    webContents.on('did-navigate', (event: any, url: string) => {
      const tab = this.tabs.get(tabId)
      if (tab) {
        if (!(tab.url === 'securevision://newtab' && url === 'about:blank')) {
          tab.url = url
          historyManager.add({ url: tab.url, title: tab.title || url, favicon: tab.favicon })
        }
        this.saveActiveWorkspaceTabs()
        this.syncTabsToRenderer()
      }
    })

    webContents.on('did-navigate-in-page', (event: any, url: string) => {
      const tab = this.tabs.get(tabId)
      if (tab) {
        if (!(tab.url === 'securevision://newtab' && url === 'about:blank')) {
          tab.url = url
          historyManager.add({ url: tab.url, title: tab.title || url, favicon: tab.favicon })
        }
        this.saveActiveWorkspaceTabs()
        this.syncTabsToRenderer()
      }
    })
  }

  public syncTabsToRenderer() {
    const tabsList = Array.from(this.tabs.values())
    this.mainWindow.webContents.send('sync-tabs', { tabs: tabsList, activeTabId: this.activeTabId })
  }

  public createTab(url: string = 'securevision://newtab'): string {
    const tabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    const newTab: Tab = {
      id: tabId,
      url,
      title: 'Loading...',
      isLoading: true,
      isSuspended: false,
      pinned: false
    }

    this.tabs.set(tabId, newTab)

    // Create view and start loading URL instantly
    if (this.currentWorkspaceId) {
      const view = this.viewManager.getOrCreateView(tabId, this.currentWorkspaceId)
      this.setupTabListeners(tabId, view.webContents)
      if (url === 'securevision://newtab') {
        view.webContents.loadURL('about:blank')
        newTab.title = 'New Tab'
        newTab.isLoading = false
      } else {
        view.webContents.loadURL(url)
      }
    }

    this.saveActiveWorkspaceTabs()
    this.switchTab(tabId) // Automatically switch to new tab
    return tabId
  }

  public switchTab(tabId: string) {
    if (!this.tabs.has(tabId) || !this.currentWorkspaceId) return

    // 1. Mark old tab as inactive and start suspension timer
    if (this.activeTabId && this.activeTabId !== tabId) {
      this.startSuspensionTimer(this.activeTabId)
    }

    // 2. Set new tab active
    this.activeTabId = tabId
    this.clearSuspensionTimer(tabId)

    const tab = this.tabs.get(tabId)!

    // 3. Un-suspend if necessary
    if (tab.isSuspended && this.currentWorkspaceId) {
      tab.isSuspended = false
      const view = this.viewManager.getOrCreateView(tabId, this.currentWorkspaceId)
      this.setupTabListeners(tabId, view.webContents)
      view.webContents.loadURL(tab.url)
    }

    // 4. Compute sensible initial bounds based on window content size so
    // the BrowserView is visible immediately (renderer will update later).
    if (tab.url === 'securevision://newtab') {
      this.viewManager.attachView(tabId, this.currentWorkspaceId, { x: -9999, y: -9999, width: 0, height: 0 })
    } else {
      try {
        const contentBounds = this.mainWindow.getContentBounds()
        // Reserve left sidebar (~260px) and top header (~44px) used by the React UI
        const leftSidebar = 260
        const topHeader = 44
        const x = leftSidebar
        const y = topHeader
        const width = Math.max(200, contentBounds.width - leftSidebar)
        const height = Math.max(200, contentBounds.height - topHeader)
        this.viewManager.attachView(tabId, this.currentWorkspaceId, { x, y, width, height })
      } catch (err) {
        // Fallback to previous hardcoded bounds if getContentBounds fails
        this.viewManager.attachView(tabId, this.currentWorkspaceId, { x: 80, y: 40, width: 1360, height: 860 })
      }
    }

    this.saveActiveWorkspaceTabs()
    this.syncTabsToRenderer()
  }

  public closeTab(tabId: string) {
    if (!this.tabs.has(tabId)) return

    this.viewManager.destroyView(tabId)
    this.clearSuspensionTimer(tabId)
    this.tabs.delete(tabId)

    // Fallback active tab
    if (this.activeTabId === tabId) {
      this.activeTabId = this.tabs.size > 0 ? Array.from(this.tabs.keys())[0] : null
      if (this.activeTabId) {
        this.switchTab(this.activeTabId)
      }
    }

    this.saveActiveWorkspaceTabs()
    this.syncTabsToRenderer()
  }

  // Memory-Aware Lifecycle: Freeze tab after 15 minutes of inactivity
  private startSuspensionTimer(tabId: string) {
    this.clearSuspensionTimer(tabId)
    const timer = setTimeout(() => {
      this.suspendTab(tabId)
    }, this.SUSPENSION_TIMEOUT_MS)
    this.tabActivityTimers.set(tabId, timer)
  }

  private clearSuspensionTimer(tabId: string) {
    const timer = this.tabActivityTimers.get(tabId)
    if (timer) clearTimeout(timer)
    this.tabActivityTimers.delete(tabId)
  }

  private async suspendTab(tabId: string) {
    const tab = this.tabs.get(tabId)
    if (!tab || tab.isSuspended) return

    // Step 1: Capture native screenshot via webContents
    const view = this.viewManager.getActiveView(tabId)
    if (view) {
      try {
        const image = await view.webContents.capturePage()
        tab.favicon = image.toDataURL() // Store as preview in real implementation
      } catch (e) {
        // Ignored
      }
    }

    // Step 2: Destroy the native view entirely to free RAM
    this.viewManager.destroyView(tabId)
    tab.isSuspended = true

    this.saveActiveWorkspaceTabs()
    this.syncTabsToRenderer()
  }
}
