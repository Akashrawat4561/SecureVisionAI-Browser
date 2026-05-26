import { BrowserView, BrowserWindow } from 'electron'
import * as path from 'path'
import { securityEngine } from './security-engine'
import { MemoryPurgeOrchestrator } from './memory-orchestrator'

export class BrowserViewManager {
  private activeViews: Map<string, BrowserView> = new Map()
  private mainWindow: BrowserWindow
  public memoryOrchestrator: MemoryPurgeOrchestrator

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
    this.memoryOrchestrator = new MemoryPurgeOrchestrator(mainWindow)
  }

  private tabCrashTracker: Map<string, { count: number; lastCrash: number }> = new Map()

  private createView(workspaceId: string): BrowserView {
    const view = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        partition: `persist:${workspaceId}`, // Dynamically partitioned by workspace
      },
    })
    
    view.setAutoResize({ width: true, height: true })
    
    // Attach real-time URL interception and threat analysis
    securityEngine.attachToWebContents(view.webContents)
    
    // ── Universal Process Watchdog & Recovery System (Phase 9 Hardening) ──────
    view.webContents.on('render-process-gone', (event, details) => {
      // Dynamically locate the Tab ID associated with this WebContents
      let tabId: string | undefined
      for (const [id, activeView] of this.activeViews.entries()) {
        if (activeView.webContents === view.webContents) {
          tabId = id
          break
        }
      }
      
      if (!tabId) {
        console.warn('[Process Watchdog] Pooled BrowserView crashed before tab binding.')
        return
      }

      console.error(`[Process Watchdog] Tab [${tabId}] process gone: ${details.reason} (Exit code: ${details.exitCode})`)
      
      const now = Date.now()
      const crashInfo = this.tabCrashTracker.get(tabId) || { count: 0, lastCrash: 0 }
      
      if (now - crashInfo.lastCrash > 60000) {
        crashInfo.count = 0
      }
      
      crashInfo.count += 1
      crashInfo.lastCrash = now
      this.tabCrashTracker.set(tabId, crashInfo)

      if (crashInfo.count <= 3) {
        console.warn(`[Process Watchdog] Attempting automatic recovery (Attempt ${crashInfo.count}/3) for tab [${tabId}]`)
        setTimeout(() => {
          if (this.activeViews.has(tabId)) {
            view.webContents.reload()
          }
        }, 1000)
      } else {
        console.error(`[Process Watchdog] Infinite crash loop suspected for tab [${tabId}]. Halting automatic restarts.`)
        this.mainWindow.webContents.send('tab-crashed-hard', { tabId, reason: details.reason })
      }
    })

    view.webContents.on('unresponsive', () => {
      let tabId: string | undefined
      for (const [id, activeView] of this.activeViews.entries()) {
        if (activeView.webContents === view.webContents) {
          tabId = id
          break
        }
      }
      if (tabId) {
        console.warn(`[Process Watchdog] WebContents for tab [${tabId}] hung/unresponsive. Triggering memory diagnostics.`)
      }
    })

    // Ensure the view runs smoothly but is initially hidden off-screen
    this.mainWindow.addBrowserView(view)
    view.setBounds({ x: -9999, y: -9999, width: 0, height: 0 })
    return view
  }

  public getOrCreateView(tabId: string, workspaceId: string): BrowserView {
    if (this.activeViews.has(tabId)) {
      return this.activeViews.get(tabId)!
    }

    if (this.memoryOrchestrator.isFrozen(tabId)) {
      return this.memoryOrchestrator.restoreTab(tabId, this.activeViews, () => this.createView(workspaceId))
    }

    const view = this.createView(workspaceId)
    this.activeViews.set(tabId, view)
    return view
  }

  public attachView(tabId: string, workspaceId: string, bounds: { x: number; y: number; width: number; height: number }) {
    const view = this.getOrCreateView(tabId, workspaceId)
    
    // Ensure view is on top
    this.mainWindow.setTopBrowserView(view)
    view.setBounds(bounds)
    
    // Enable active execution
    view.webContents.setBackgroundThrottling(false)
    
    // Detach and throttle all other active views by sending them off-screen
    for (const [id, activeView] of this.activeViews.entries()) {
      if (id !== tabId) {
        activeView.setBounds({ x: -9999, y: -9999, width: 0, height: 0 })
        // Mitigate memory/CPU bloat by throttling background tabs
        activeView.webContents.setBackgroundThrottling(true)
      }
    }

    // Run resource manager leak prevention and memory audit
    this.memoryOrchestrator.auditMemoryPressure(tabId, this.activeViews)
  }

  public destroyView(tabId: string) {
    const view = this.activeViews.get(tabId)
    if (view) {
      this.mainWindow.removeBrowserView(view)
      // Electron handles BrowserView garbage collection when unreferenced natively
      ;(view.webContents as any).destroy()
      this.activeViews.delete(tabId)
    }
  }

  public getActiveView(tabId: string): BrowserView | undefined {
    return this.activeViews.get(tabId)
  }
}
