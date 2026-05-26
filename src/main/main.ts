import { app, BrowserWindow, ipcMain, session } from 'electron'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
import { BrowserViewManager } from './browser-view-manager'
import { TabManager } from './tab-manager'
import { SessionManager } from './session-manager'
import { HistoryManager } from './history-manager'
import { BookmarksManager } from './bookmarks-manager'
import { DownloadsManager } from './downloads-manager'
import { WorkspaceManager } from './workspace-manager'
import { SettingsManager } from './settings-manager'
import { createShortcutRegistry } from './keyboard-shortcuts'
import { securityEngine } from './security-engine'
import { applyIpcHardening } from './ipc-validator'
import { ExtensionSecurityManager } from './extension-security-manager'

const isDev = process.env.NODE_ENV !== 'production'

// ── Apply IPC Hardening (Phase 9) ──────────────────────────────────────────
applyIpcHardening()

import { globalSafeModeManager } from './safe-mode-manager'
import { globalTelemetryManager } from './telemetry-diagnostics'
import { globalUpdateManager } from './update-manager'

// ── Singleton manager instances (main-process only) ──────────────────────────
const sessionMgr = new SessionManager()
const historyMgr = new HistoryManager()
const bookmarksMgr = new BookmarksManager()
const workspaceMgr = new WorkspaceManager()
const settingsMgr = new SettingsManager()
const extensionMgr = new ExtensionSecurityManager()

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    vibrancy: 'sidebar',
    visualEffectState: 'active',
    backgroundColor: '#09090b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
    },
  })

  // ── Strict CSP enforcement ─────────────────────────────────────────────────
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.openai.com https://generativelanguage.googleapis.com wss: https:; img-src 'self' data: https:; font-src 'self' data:;",
        ],
        'X-Frame-Options': ['SAMEORIGIN'],
        'X-Content-Type-Options': ['nosniff'],
      },
    })
  })

  // ── Core browser managers ──────────────────────────────────────────────────
  const viewMgr = new BrowserViewManager(mainWindow)
  const tabMgr = new TabManager(mainWindow, viewMgr)
  const downloadsMgr = new DownloadsManager(mainWindow)

  // Register download handler on default session
  downloadsMgr.registerSessionDownloadHandler(session.defaultSession)

  // Attach core security engine to default session (trackers & fingerprinting)
  securityEngine.attachToSession(session.defaultSession)
  
  // Sync initial settings to security engine
  securityEngine.updateConfig({
    trackerBlocking: settingsMgr.get('trackerBlockingEnabled'),
    fingerprintProtection: settingsMgr.get('fingerprintProtectionEnabled'),
  })

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  const shortcuts = createShortcutRegistry(mainWindow, {
    newTab: () => tabMgr.createTab('securevision://newtab'),
    closeTab: () => {
      const state = tabMgr['activeTabId']
      if (state) tabMgr.closeTab(state)
    },
    reloadTab: () => {
      const activeId = tabMgr['activeTabId']
      if (activeId) {
        const view = viewMgr.getActiveView(activeId)
        view?.webContents.reload()
      }
    },
    toggleDevTools: () => mainWindow.webContents.toggleDevTools(),
    openCommandPalette: () => mainWindow.webContents.send('open-command-palette'),
    focusAddressBar: () => mainWindow.webContents.send('focus-address-bar'),
  })

  mainWindow.on('focus', () => shortcuts.registerAll())
  mainWindow.on('blur', () => shortcuts.unregisterAll())
  mainWindow.on('closed', () => {
    shortcuts.unregisterAll()
    sessionMgr.destroyIncognitoSessions()
    historyMgr.destroy()
  })

  // ── IPC: Settings ──────────────────────────────────────────────────────────
  ipcMain.handle('secure-store-get', (_event, key: string) => settingsMgr.get(key as any))
  ipcMain.handle('secure-store-update-theme', (_event, { theme }) => settingsMgr.set('theme', theme))
  ipcMain.handle('secure-store-update-ai-settings', (_event, { settings }) => settingsMgr.update(settings))
  ipcMain.handle('settings-get-all', () => settingsMgr.getAll())
  ipcMain.on('settings-update', (_event, partial) => {
    settingsMgr.update(partial)
    // Live update security engine if relevant settings change
    if (partial.trackerBlockingEnabled !== undefined || partial.fingerprintProtectionEnabled !== undefined) {
      securityEngine.updateConfig({
        trackerBlocking: partial.trackerBlockingEnabled,
        fingerprintProtection: partial.fingerprintProtectionEnabled,
      })
    }
  })

  // ── IPC: History ───────────────────────────────────────────────────────────
  ipcMain.handle('history-get-recent', (_event, limit?: number) => historyMgr.getRecent(limit))
  ipcMain.handle('history-search', (_event, query: string) => historyMgr.search(query))
  ipcMain.on('history-clear', () => historyMgr.clear())

  // ── IPC: Bookmarks ─────────────────────────────────────────────────────────
  ipcMain.handle('bookmarks-get', (_event, workspaceId: string) => bookmarksMgr.getByWorkspace(workspaceId))
  ipcMain.handle('bookmarks-search', (_event, query: string) => bookmarksMgr.search(query))
  ipcMain.handle('bookmarks-add', (_event, entry) => bookmarksMgr.add(entry))
  ipcMain.on('bookmarks-remove', (_event, id: string) => bookmarksMgr.remove(id))

  // ── IPC: Extensions ────────────────────────────────────────────────────────
  ipcMain.handle('extensions-get', () => extensionMgr.getExtensions())
  ipcMain.handle('extensions-toggle', (_event, id: string) => extensionMgr.toggleExtension(id))

  // ── IPC: Workspaces ────────────────────────────────────────────────────────
  ipcMain.handle('workspaces-get-all', () => workspaceMgr.getAll())
  ipcMain.handle('workspaces-get-active', () => workspaceMgr.getActive())
  ipcMain.handle('workspaces-create', (_event, opts) => workspaceMgr.create(opts))
  ipcMain.on('workspaces-set-active', (_event, workspaceId: string) => {
    workspaceMgr.setActive(workspaceId)
    tabMgr.switchWorkspace(workspaceId)
  })
  ipcMain.on('workspaces-remove', (_event, workspaceId: string) => {
    const wasActive = workspaceMgr.getActive()?.id === workspaceId
    const success = workspaceMgr.remove(workspaceId)
    if (success && wasActive) {
      const newActive = workspaceMgr.getActive()
      if (newActive) {
        tabMgr.switchWorkspace(newActive.id)
      }
    }
  })
  ipcMain.on('workspaces-rename', (_event, { id, name }) => workspaceMgr.rename(id, name))

  // ── IPC: Page Content for AI ───────────────────────────────────────────────
  ipcMain.handle('get-page-content', async () => {
    const activeId = tabMgr['activeTabId']
    if (!activeId) return ''
    const view = viewMgr.getActiveView(activeId)
    if (!view) return ''
    try {
      return await view.webContents.executeJavaScript('document.body.innerText')
    } catch {
      return ''
    }
  })

  // ── IPC: Telemetry & Consent ────────────────────────────────────────────────
  ipcMain.on('telemetry-set-consent', (_event, consent: boolean) => globalTelemetryManager.setTelemetryConsent(consent))
  ipcMain.handle('telemetry-get-consent', () => globalTelemetryManager.getConsent())
  ipcMain.on('telemetry-track-event', (_event, event: string, payload?: any) => globalTelemetryManager.trackEvent(event, payload))
  ipcMain.handle('telemetry-export-diagnostics', () => globalTelemetryManager.generateDiagnosticsBundle(mainWindow))

  // ── IPC: Signed Updates ────────────────────────────────────────────────────
  ipcMain.handle('updates-check', () => globalUpdateManager.checkForUpdates(app.getVersion()))
  ipcMain.on('updates-set-channel', (_event, channel: any) => globalUpdateManager.setChannel(channel))

  globalUpdateManager.setMainWindow(mainWindow)

  // ── Load renderer ──────────────────────────────────────────────────────────
  if (isDev) {
    const devUrl = process.env.ELECTRON_RENDERER_URL || 'http://localhost:5174'
    mainWindow.loadURL(devUrl)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'))
  }

  // Show SecureVision Dashboard on launch (no initial tab = dashboard is displayed)
  mainWindow.webContents.on('did-finish-load', () => {
    globalSafeModeManager.reportSuccessfulLaunch()
    tabMgr.syncTabsToRenderer()
  })
}

app.enableSandbox()

app.whenReady().then(() => {
  createWindow()
  globalUpdateManager.registerUpdateSuccess(app.getVersion())
  setTimeout(() => globalUpdateManager.startAutoUpdateCheck(), 10_000)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
