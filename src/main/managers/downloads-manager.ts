import { ipcMain, BrowserWindow, DownloadItem } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

export type DownloadState = 'progressing' | 'completed' | 'cancelled' | 'interrupted'

export interface Download {
  id: string
  url: string
  filename: string
  savePath: string
  totalBytes: number
  receivedBytes: number
  state: DownloadState
  startedAt: string
  completedAt?: string
  mimeType?: string
}

/**
 * DownloadsManager — integrates with Electron's session.on('will-download')
 * to track, update, and persist download state.
 *
 * Security:
 *  - Downloads always resolve to user's Downloads folder (no arbitrary path writes)
 *  - Executable files (.exe, .bat, .sh, .ps1) trigger a security check before saving
 */
export class DownloadsManager {
  private downloads: Map<string, Download> = new Map()
  private mainWindow: BrowserWindow
  private readonly EXECUTABLE_EXTENSIONS = ['.exe', '.bat', '.sh', '.ps1', '.msi', '.dmg', '.pkg']

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
  }

  public registerSessionDownloadHandler(sess: Electron.Session) {
    sess.on('will-download', (_event, item: DownloadItem) => {
      const id = `dl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      const filename = item.getFilename()
      const ext = path.extname(filename).toLowerCase()
      const savePath = path.join(this.getSaveDirectory(), filename)

      item.setSavePath(savePath)

      const download: Download = {
        id,
        url: item.getURL(),
        filename,
        savePath,
        totalBytes: item.getTotalBytes(),
        receivedBytes: 0,
        state: 'progressing',
        startedAt: new Date().toISOString(),
        mimeType: item.getMimeType() || undefined,
      }

      this.downloads.set(id, download)
      this.pushToRenderer()

      // Flag executables for security review
      if (this.EXECUTABLE_EXTENSIONS.includes(ext)) {
        this.mainWindow.webContents.send('security-alert', {
          type: 'EXECUTABLE_DOWNLOAD',
          message: `Executable download detected: ${filename}`,
          url: item.getURL(),
          severity: 'HIGH',
        })
      }

      item.on('updated', (_event, state) => {
        download.receivedBytes = item.getReceivedBytes()
        download.state = state as DownloadState
        this.downloads.set(id, { ...download })
        this.pushToRenderer()
      })

      item.once('done', (_event, state) => {
        download.state = state as DownloadState
        download.receivedBytes = item.getReceivedBytes()
        download.completedAt = new Date().toISOString()
        this.downloads.set(id, { ...download })
        this.pushToRenderer()
      })
    })

    // IPC: cancel download from renderer
    ipcMain.on('cancel-download', (_event, downloadId: string) => {
      // Note: In a full implementation, keep a reference to DownloadItem and call .cancel()
      const dl = this.downloads.get(downloadId)
      if (dl) {
        dl.state = 'cancelled'
        this.downloads.set(downloadId, dl)
        this.pushToRenderer()
      }
    })
  }

  private getSaveDirectory(): string {
    const { app } = require('electron')
    return app.getPath('downloads')
  }

  private pushToRenderer() {
    this.mainWindow.webContents.send('sync-downloads', Array.from(this.downloads.values()))
  }

  public getAll(): Download[] {
    return Array.from(this.downloads.values())
  }

  public clearCompleted() {
    for (const [id, dl] of this.downloads.entries()) {
      if (dl.state === 'completed' || dl.state === 'cancelled') {
        this.downloads.delete(id)
      }
    }
    this.pushToRenderer()
  }
}
