import { app, BrowserWindow } from 'electron'
import updaterPkg from 'electron-updater'
const { autoUpdater } = (updaterPkg as any)
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

export type UpdateChannel = 'stable' | 'beta' | 'nightly'

export interface UpdateManifest {
  version: string
  channel: UpdateChannel
  downloadUrl: string
  sha256: string
  minOsVersion?: string
}

/**
 * Release & auto-update manager.
 * Production packaged builds use electron-updater (GitHub Releases, S3, etc.).
 * Dev / unpackaged runs use a mock manifest for UI testing.
 */
export class ReleaseUpdateManager {
  private currentChannel: UpdateChannel = 'stable'
  private updateServerUrl: string = 'https://update.securevision.ai/api'
  private updateHistoryPath: string
  private updateHistory: string[] = []
  private mainWindow: BrowserWindow | null = null

  constructor() {
    const userData = app.getPath('userData')
    this.updateHistoryPath = path.join(userData, 'update_history.json')
    this.loadHistory()
    this.configureAutoUpdater()
  }

  private configureAutoUpdater() {
    if (!app.isPackaged) return

    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.allowDowngrade = false

    autoUpdater.on('checking-for-update', () => {
      console.log('[UpdateManager] Checking for updates…')
    })

    autoUpdater.on('update-available', (info) => {
      console.log(`[UpdateManager] Update available: v${info.version}`)
      this.notifyRenderer('update-available', { version: info.version })
    })

    autoUpdater.on('update-not-available', () => {
      console.log('[UpdateManager] Already on the latest release.')
    })

    autoUpdater.on('error', (err) => {
      console.error('[UpdateManager] Auto-update error:', err.message)
    })

    autoUpdater.on('download-progress', (progress) => {
      this.notifyRenderer('update-download-progress', {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
      })
    })

    autoUpdater.on('update-downloaded', (info) => {
      console.log(`[UpdateManager] Update downloaded: v${info.version}`)
      this.registerUpdateSuccess(info.version)
      this.notifyRenderer('update-downloaded', { version: info.version })
    })
  }

  public setMainWindow(window: BrowserWindow | null) {
    this.mainWindow = window
  }

  private notifyRenderer(event: string, payload: Record<string, unknown>) {
    this.mainWindow?.webContents.send('app-update', { event, ...payload })
  }

  /**
   * Called once after launch in production — checks and notifies when an update exists.
   */
  public startAutoUpdateCheck(): void {
    if (!app.isPackaged) {
      console.log('[UpdateManager] Skipping auto-update (unpackaged dev build).')
      return
    }

    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.error('[UpdateManager] checkForUpdatesAndNotify failed:', err.message)
    })
  }

  public setChannel(channel: UpdateChannel) {
    this.currentChannel = channel
    console.log(`[UpdateManager] Active distribution channel switched to: ${channel}`)
  }

  public async checkForUpdates(
    currentVersion: string
  ): Promise<{ updateAvailable: boolean; manifest?: UpdateManifest; reason?: string }> {
    if (app.isPackaged) {
      try {
        const result = await autoUpdater.checkForUpdates()
        const next = result?.updateInfo?.version
        if (next && next !== currentVersion) {
          return {
            updateAvailable: true,
            manifest: {
              version: next,
              channel: this.currentChannel,
              downloadUrl: '',
              sha256: '',
            },
          }
        }
        return { updateAvailable: false, reason: 'Already running the latest release build.' }
      } catch (err: any) {
        return { updateAvailable: false, reason: err?.message || 'Update check failed.' }
      }
    }

    console.log(
      `[UpdateManager] Mock update check on channel [${this.currentChannel}] (Current: v${currentVersion})…`
    )
    const mockRemoteVersion =
      this.currentChannel === 'nightly' ? `${currentVersion}-nightly.${Date.now()}` : '2.0.0'
    const hasNewer = mockRemoteVersion !== currentVersion

    if (!hasNewer) {
      return { updateAvailable: false, reason: 'Already running the latest release build.' }
    }

    return {
      updateAvailable: true,
      manifest: {
        version: mockRemoteVersion,
        channel: this.currentChannel,
        downloadUrl: `${this.updateServerUrl}/downloads/securevision-${mockRemoteVersion}.exe`,
        sha256: crypto.randomBytes(32).toString('hex'),
      },
    }
  }

  public verifyPackageIntegrity(filePath: string, expectedHash: string): boolean {
    try {
      if (!fs.existsSync(filePath)) return false
      const fileBuffer = fs.readFileSync(filePath)
      const sum = crypto.createHash('sha256').update(fileBuffer).digest('hex')

      const isValid = sum === expectedHash
      if (!isValid) {
        console.error(
          `[UpdateManager] SECURITY ALERT: Package hash mismatch! Got: ${sum}, Expected: ${expectedHash}`
        )
      }
      return isValid
    } catch (err) {
      console.error('[UpdateManager] Error verifying integrity checksum:', err)
      return false
    }
  }

  public executeRollback(): { rolledBack: boolean; targetVersion?: string } {
    if (this.updateHistory.length < 2) {
      console.warn('[UpdateManager] Rollback requested, but no previous version logs are found.')
      return { rolledBack: false }
    }

    const previousVersion = this.updateHistory[this.updateHistory.length - 2]
    console.error(
      `[UpdateManager] FATAL ERROR DETECTED ON RECENT UPDATE. Reverting to: v${previousVersion}`
    )

    this.updateHistory.pop()
    this.saveHistory()

    return { rolledBack: true, targetVersion: previousVersion }
  }

  private saveHistory() {
    try {
      fs.writeFileSync(this.updateHistoryPath, JSON.stringify(this.updateHistory, null, 2), 'utf8')
    } catch (err) {
      console.error('[UpdateManager] Failed to write update history:', err)
    }
  }

  private loadHistory() {
    try {
      if (fs.existsSync(this.updateHistoryPath)) {
        this.updateHistory = JSON.parse(fs.readFileSync(this.updateHistoryPath, 'utf8'))
      }
    } catch {
      this.updateHistory = []
    }
  }

  public registerUpdateSuccess(version: string) {
    if (this.updateHistory[this.updateHistory.length - 1] !== version) {
      this.updateHistory.push(version)
      this.saveHistory()
    }
  }

  public getChannel(): UpdateChannel {
    return this.currentChannel
  }
}

export const globalUpdateManager = new ReleaseUpdateManager()
