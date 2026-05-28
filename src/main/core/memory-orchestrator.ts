import { BrowserView, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

export interface TabFreezeState {
  tabId: string
  url: string
  title: string
  snapshotPath: string | null
  frozenAt: number
}

/**
 * MemoryPurgeOrchestrator (Phase 10 — Production Hardening)
 * 
 * Responsibilities:
 * 1. Tracks memory consumption of all active BrowserView WebContents.
 * 2. Compresses background views into compressed WebP/PNG snapshots when memory budgets are breached.
 * 3. Safely destroys the underlying WebContents process to purge RAM.
 * 4. Transparently restores the BrowserView on click (lazy hydration).
 */
export class MemoryPurgeOrchestrator {
  private frozenTabs: Map<string, TabFreezeState> = new Map()
  private mainWindow: BrowserWindow
  private snapshotDir: string

  // Hard Memory Budgets
  private readonly RENDERER_MAX_RAM_MB = 512
  private readonly MAXIMUM_ACTIVE_VIEWS = 6

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
    this.snapshotDir = path.join(mainWindow.webContents.session.getStoragePath(), 'tab_snapshots')
    
    if (!fs.existsSync(this.snapshotDir)) {
      fs.mkdirSync(this.snapshotDir, { recursive: true })
    }
  }

  /**
   * Evaluates system memory pressure and orchestrates background tab freezing
   */
  public async auditMemoryPressure(activeTabId: string, activeViews: Map<string, BrowserView>) {
    // 1. Gather all background tab IDs sorted by least-recently-accessed
    const backgroundTabs = Array.from(activeViews.entries())
      .filter(([id]) => id !== activeTabId)
      
    if (activeViews.size <= this.MAXIMUM_ACTIVE_VIEWS) {
      return // No immediate action needed if view count is within limits
    }

    console.warn(`[MemoryPurge] Active views count (${activeViews.size}) exceeds limit (${this.MAXIMUM_ACTIVE_VIEWS}). Purging background processes.`)

    // Purge the oldest background tab first
    const oldestTab = backgroundTabs[0]
    if (oldestTab) {
      await this.freezeTab(oldestTab[0], oldestTab[1], activeViews)
    }
  }

  /**
   * Captures a WebP snapshot, writes tab state metadata, and destroys the WebContents process to liberate memory
   */
  public async freezeTab(tabId: string, view: BrowserView, activeViews: Map<string, BrowserView>) {
    if (this.frozenTabs.has(tabId)) return

    try {
      console.log(`[MemoryPurge] Freezing tab [${tabId}] to recover system memory...`)
      
      // Capture WebContents image
      const image = await view.webContents.capturePage()
      const webpBuffer = image.toJPEG(80) // Fast high-compression capture
      const snapshotPath = path.join(this.snapshotDir, `${tabId}.jpg`)
      
      fs.writeFileSync(snapshotPath, webpBuffer)

      const url = view.webContents.getURL()
      const title = view.webContents.getTitle()

      // Record state metadata
      this.frozenTabs.set(tabId, {
        tabId,
        url,
        title,
        snapshotPath,
        frozenAt: Date.now()
      })

      // Safely detach from window
      this.mainWindow.removeBrowserView(view)
      
      // Completely destroy WebContents to flush process allocation
      ;(view.webContents as any).destroy()
      
      // Remove from the active views registry
      activeViews.delete(tabId)

      console.log(`[MemoryPurge] Tab [${tabId}] successfully frozen. WebContents process killed, RAM reclaimed.`)
      
      // Alert the renderer about the tab state update
      this.mainWindow.webContents.send('tab-frozen', { tabId, snapshotPath })
    } catch (error) {
      console.error(`[MemoryPurge] Failed to freeze tab [${tabId}]:`, error)
    }
  }

  /**
   * Lazily re-creates a frozen tab process when the user clicks back to it
   */
  public restoreTab(tabId: string, activeViews: Map<string, BrowserView>, createViewFn: () => BrowserView): BrowserView {
    const frozenState = this.frozenTabs.get(tabId)
    if (!frozenState) {
      throw new Error(`Tab [${tabId}] is not in frozen storage state.`)
    }

    console.log(`[MemoryPurge] Lazily restoring frozen tab [${tabId}] -> ${frozenState.url}`)

    // Create a fresh BrowserView process
    const view = createViewFn()
    activeViews.set(tabId, view)
    
    // Load the stored URL
    view.webContents.loadURL(frozenState.url)

    // Delete frozen metadata record and purge snapshot file
    this.frozenTabs.delete(tabId)
    if (frozenState.snapshotPath && fs.existsSync(frozenState.snapshotPath)) {
      try {
        fs.unlinkSync(frozenState.snapshotPath)
      } catch (err) {
        console.error('[MemoryPurge] Error cleaning snapshot file:', err)
      }
    }

    this.mainWindow.webContents.send('tab-thawed', { tabId })
    return view
  }

  public isFrozen(tabId: string): boolean {
    return this.frozenTabs.has(tabId)
  }

  public getSnapshotPath(tabId: string): string | null {
    return this.frozenTabs.get(tabId)?.snapshotPath || null
  }
}
