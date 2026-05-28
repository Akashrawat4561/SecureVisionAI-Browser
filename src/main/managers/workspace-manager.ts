import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import { Workspace } from '@securevision/shared'

const WORKSPACE_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#06b6d4', '#84cc16',
]
const WORKSPACE_ICONS = ['🏠', '💼', '🔬', '📚', '🎨', '🛡️', '🚀', '💡']

/**
 * WorkspaceManager — manages named browser workspaces.
 *
 * Each workspace:
 *  - Has its own isolated Electron session partition (enforced by SessionManager)
 *  - Stores its own tabs, bookmarks, and settings
 *  - Persists to disk across restarts
 */
export class WorkspaceManager {
  private readonly filePath: string
  private workspaces: Map<string, Workspace> = new Map()
  private activeWorkspaceId: string | null = null

  constructor() {
    this.filePath = path.join(app.getPath('userData'), 'securevision-workspaces.json')
    this.load()
    this.ensureDefaultWorkspace()
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'))
        const list: Workspace[] = Array.isArray(raw.workspaces) ? raw.workspaces : []
        list.forEach((ws) => this.workspaces.set(ws.id, ws))
        this.activeWorkspaceId = raw.activeWorkspaceId || null
      }
    } catch {
      this.workspaces = new Map()
    }
  }

  private save() {
    try {
      fs.writeFileSync(
        this.filePath,
        JSON.stringify({
          workspaces: Array.from(this.workspaces.values()),
          activeWorkspaceId: this.activeWorkspaceId,
        }),
        'utf-8'
      )
    } catch (e) {
      console.error('[WorkspaceManager] Save failed:', e)
    }
  }

  private ensureDefaultWorkspace() {
    if (this.workspaces.size === 0) {
      this.create({ name: 'Personal', icon: '🏠', color: '#3b82f6' })
    }
    if (!this.activeWorkspaceId) {
      this.activeWorkspaceId = this.workspaces.keys().next().value ?? null
    }
  }

  public create(opts: { name: string; icon?: string; color?: string }): Workspace {
    const idx = this.workspaces.size % WORKSPACE_COLORS.length
    const workspace: Workspace = {
      id: `ws_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: opts.name,
      icon: opts.icon || WORKSPACE_ICONS[idx],
      color: opts.color || WORKSPACE_COLORS[idx],
      tabs: [],
      pinned: false,
      createdAt: new Date().toISOString(),
    }
    this.workspaces.set(workspace.id, workspace)
    this.save()
    return workspace
  }

  public getActive(): Workspace | null {
    return this.activeWorkspaceId
      ? (this.workspaces.get(this.activeWorkspaceId) ?? null)
      : null
  }

  public saveWorkspaceTabs(workspaceId: string, tabs: Tab[], activeTabId: string | null) {
    const ws = this.workspaces.get(workspaceId)
    if (ws) {
      ws.tabs = tabs
      ws.activeTabId = activeTabId
      this.save()
    }
  }

  public setActive(workspaceId: string) {
    if (!this.workspaces.has(workspaceId)) return
    this.activeWorkspaceId = workspaceId
    this.save()
  }

  public getAll(): Workspace[] {
    return Array.from(this.workspaces.values())
  }

  public remove(workspaceId: string): boolean {
    if (this.workspaces.size <= 1) return false // Cannot delete last workspace
    const deleted = this.workspaces.delete(workspaceId)
    if (deleted) {
      if (this.activeWorkspaceId === workspaceId) {
        this.activeWorkspaceId = this.workspaces.keys().next().value ?? null
      }
      this.save()
    }
    return deleted
  }

  public rename(workspaceId: string, name: string) {
    const ws = this.workspaces.get(workspaceId)
    if (ws) {
      ws.name = name
      this.workspaces.set(workspaceId, ws)
      this.save()
    }
  }
}

export const workspaceManager = new WorkspaceManager()
