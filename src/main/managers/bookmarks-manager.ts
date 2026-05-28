import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'

export interface Bookmark {
  id: string
  url: string
  title: string
  favicon?: string
  workspaceId: string
  folderId?: string
  createdAt: string
}

export interface BookmarkFolder {
  id: string
  name: string
  workspaceId: string
  createdAt: string
}

/**
 * BookmarksManager — persists bookmarks per workspace to disk.
 * Bookmarks are workspace-scoped (matching our session isolation model).
 */
export class BookmarksManager {
  private readonly bookmarksFilePath: string
  private bookmarks: Bookmark[] = []
  private folders: BookmarkFolder[] = []
  private dirty = false

  constructor() {
    const userDataPath = app.getPath('userData')
    this.bookmarksFilePath = path.join(userDataPath, 'securevision-bookmarks.json')
    this.load()
  }

  private load() {
    try {
      if (fs.existsSync(this.bookmarksFilePath)) {
        const raw = JSON.parse(fs.readFileSync(this.bookmarksFilePath, 'utf-8'))
        this.bookmarks = Array.isArray(raw.bookmarks) ? raw.bookmarks : []
        this.folders = Array.isArray(raw.folders) ? raw.folders : []
      }
    } catch {
      this.bookmarks = []
      this.folders = []
    }
  }

  private save() {
    if (!this.dirty) return
    try {
      fs.writeFileSync(
        this.bookmarksFilePath,
        JSON.stringify({ bookmarks: this.bookmarks, folders: this.folders }),
        'utf-8'
      )
      this.dirty = false
    } catch (e) {
      console.error('[BookmarksManager] Failed to save:', e)
    }
  }

  public add(entry: Omit<Bookmark, 'id' | 'createdAt'>): Bookmark {
    const bookmark: Bookmark = {
      ...entry,
      id: `bm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    }
    this.bookmarks.push(bookmark)
    this.dirty = true
    this.save()
    return bookmark
  }

  public remove(id: string): boolean {
    const prev = this.bookmarks.length
    this.bookmarks = this.bookmarks.filter((b) => b.id !== id)
    if (this.bookmarks.length !== prev) {
      this.dirty = true
      this.save()
      return true
    }
    return false
  }

  public getByWorkspace(workspaceId: string): Bookmark[] {
    return this.bookmarks.filter((b) => b.workspaceId === workspaceId)
  }

  public search(query: string, workspaceId?: string): Bookmark[] {
    const q = query.toLowerCase()
    return this.bookmarks.filter((b) => {
      const matchesWs = workspaceId ? b.workspaceId === workspaceId : true
      return matchesWs && (b.url.toLowerCase().includes(q) || b.title.toLowerCase().includes(q))
    })
  }

  public isBookmarked(url: string, workspaceId: string): boolean {
    return this.bookmarks.some((b) => b.url === url && b.workspaceId === workspaceId)
  }
}

export const bookmarksManager = new BookmarksManager()
