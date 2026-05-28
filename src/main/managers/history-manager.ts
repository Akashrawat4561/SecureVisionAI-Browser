import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'

export interface HistoryEntry {
  id: string
  url: string
  title: string
  visitedAt: string
  favicon?: string
}

/**
 * HistoryManager — persists browsing history to a bounded JSON file.
 *
 * Memory policy:
 *  - In-memory ring buffer capped at MAX_ENTRIES (1000 items).
 *  - Periodic flush to disk every FLUSH_INTERVAL_MS.
 *  - Incognito tabs NEVER write to history.
 */
export class HistoryManager {
  private readonly MAX_ENTRIES = 1000
  private readonly FLUSH_INTERVAL_MS = 60_000 // 1 minute
  private readonly historyFilePath: string
  private entries: HistoryEntry[] = []
  private flushTimer: NodeJS.Timeout | null = null
  private dirty = false

  constructor() {
    const userDataPath = app.getPath('userData')
    this.historyFilePath = path.join(userDataPath, 'securevision-history.json')
    this.load()
    this.startFlushTimer()
  }

  private load() {
    try {
      if (fs.existsSync(this.historyFilePath)) {
        const raw = fs.readFileSync(this.historyFilePath, 'utf-8')
        const parsed = JSON.parse(raw)
        this.entries = Array.isArray(parsed) ? parsed.slice(-this.MAX_ENTRIES) : []
      }
    } catch {
      this.entries = []
    }
  }

  private flush() {
    if (!this.dirty) return
    try {
      fs.writeFileSync(this.historyFilePath, JSON.stringify(this.entries), 'utf-8')
      this.dirty = false
    } catch (e) {
      console.error('[HistoryManager] Failed to flush history to disk:', e)
    }
  }

  private startFlushTimer() {
    this.flushTimer = setInterval(() => this.flush(), this.FLUSH_INTERVAL_MS)
    // Do not prevent app quit
    if (this.flushTimer.unref) this.flushTimer.unref()
  }

  public add(entry: Omit<HistoryEntry, 'id' | 'visitedAt'>, isIncognito = false) {
    if (isIncognito) return // Never persist incognito history

    // Prevent duplicate consecutive entries
    const lastEntry = this.entries[this.entries.length - 1]
    if (lastEntry && lastEntry.url === entry.url) {
      lastEntry.visitedAt = new Date().toISOString()
      lastEntry.title = entry.title || lastEntry.title
      if (entry.favicon) lastEntry.favicon = entry.favicon
      this.dirty = true
      return
    }

    const newEntry: HistoryEntry = {
      ...entry,
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      visitedAt: new Date().toISOString(),
    }

    // Push and trim to ring-buffer size
    this.entries.push(newEntry)
    if (this.entries.length > this.MAX_ENTRIES) {
      this.entries = this.entries.slice(-this.MAX_ENTRIES)
    }

    this.dirty = true
  }

  public search(query: string, limit = 50): HistoryEntry[] {
    const q = query.toLowerCase()
    return this.entries
      .filter((e) => e.url.toLowerCase().includes(q) || e.title.toLowerCase().includes(q))
      .reverse()
      .slice(0, limit)
  }

  public getRecent(limit = 100): HistoryEntry[] {
    return [...this.entries].reverse().slice(0, limit)
  }

  public clear() {
    this.entries = []
    this.dirty = true
    this.flush()
  }

  public remove(id: string) {
    const idx = this.entries.findIndex(e => e.id === id)
    if (idx !== -1) {
      this.entries.splice(idx, 1)
      this.dirty = true
      this.flush()
    }
  }

  public destroy() {
    if (this.flushTimer) clearInterval(this.flushTimer)
    this.flush()
  }
}

export const historyManager = new HistoryManager()
