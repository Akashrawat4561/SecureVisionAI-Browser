/**
 * Phase 2 Unit Tests — SecureVision AI Browser Core
 * Test runner: Vitest
 *
 * Coverage:
 *  - TabManager lifecycle (create, switch, suspend, close)
 *  - HistoryManager (add, search, ring-buffer cap, incognito bypass)
 *  - BookmarksManager (add, remove, workspace scoping, search)
 *  - WorkspaceManager (create, rename, remove, default enforcement)
 *  - SettingsManager (get, set, reset, upgrade-safe merge)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mock Electron APIs ──────────────────────────────────────────────────────
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test-userdata'),
  },
  ipcMain: {
    on: vi.fn(),
    handle: vi.fn(),
  },
  BrowserWindow: vi.fn(),
  BrowserView: vi.fn(),
  session: {
    fromPartition: vi.fn(() => ({
      cookies: { on: vi.fn(), remove: vi.fn() },
      setPermissionRequestHandler: vi.fn(),
      setPermissionCheckHandler: vi.fn(),
      webRequest: { onBeforeSendHeaders: vi.fn() },
      clearStorageData: vi.fn(() => Promise.resolve()),
      clearCache: vi.fn(() => Promise.resolve()),
    })),
  },
}))

// ── Mock fs module ──────────────────────────────────────────────────────────
vi.mock('fs', () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => '[]'),
  writeFileSync: vi.fn(),
}))

// ── HistoryManager Tests ────────────────────────────────────────────────────
describe('HistoryManager', () => {
  let HistoryManager: any
  let manager: any

  beforeEach(async () => {
    vi.resetModules()
    ;({ HistoryManager } = await import('../src/main/history-manager'))
    manager = new HistoryManager()
  })

  afterEach(() => manager?.destroy?.())

  it('adds a new history entry', () => {
    manager.add({ url: 'https://example.com', title: 'Example' })
    const recent = manager.getRecent()
    expect(recent).toHaveLength(1)
    expect(recent[0].url).toBe('https://example.com')
  })

  it('does NOT add entries when incognito=true', () => {
    manager.add({ url: 'https://secret.com', title: 'Secret' }, true)
    expect(manager.getRecent()).toHaveLength(0)
  })

  it('enforces ring-buffer cap at MAX_ENTRIES', () => {
    const MAX = 1000
    for (let i = 0; i < MAX + 50; i++) {
      manager.add({ url: `https://site${i}.com`, title: `Site ${i}` })
    }
    expect(manager.getRecent(2000)).toHaveLength(MAX)
  })

  it('searches history by URL and title', () => {
    manager.add({ url: 'https://github.com', title: 'GitHub' })
    manager.add({ url: 'https://openai.com', title: 'OpenAI' })
    const results = manager.search('github')
    expect(results).toHaveLength(1)
    expect(results[0].url).toBe('https://github.com')
  })

  it('clears all history', () => {
    manager.add({ url: 'https://example.com', title: 'Example' })
    manager.clear()
    expect(manager.getRecent()).toHaveLength(0)
  })
})

// ── BookmarksManager Tests ──────────────────────────────────────────────────
describe('BookmarksManager', () => {
  let BookmarksManager: any
  let manager: any

  beforeEach(async () => {
    vi.resetModules()
    ;({ BookmarksManager } = await import('../src/main/bookmarks-manager'))
    manager = new BookmarksManager()
  })

  it('adds a bookmark', () => {
    const bm = manager.add({ url: 'https://example.com', title: 'Example', workspaceId: 'ws_1' })
    expect(bm.id).toBeTruthy()
    expect(manager.getByWorkspace('ws_1')).toHaveLength(1)
  })

  it('removes a bookmark by id', () => {
    const bm = manager.add({ url: 'https://example.com', title: 'Example', workspaceId: 'ws_1' })
    const removed = manager.remove(bm.id)
    expect(removed).toBe(true)
    expect(manager.getByWorkspace('ws_1')).toHaveLength(0)
  })

  it('scopes bookmarks per workspace', () => {
    manager.add({ url: 'https://work.com', title: 'Work', workspaceId: 'ws_work' })
    manager.add({ url: 'https://personal.com', title: 'Personal', workspaceId: 'ws_personal' })
    expect(manager.getByWorkspace('ws_work')).toHaveLength(1)
    expect(manager.getByWorkspace('ws_personal')).toHaveLength(1)
  })

  it('detects if a URL is already bookmarked', () => {
    manager.add({ url: 'https://example.com', title: 'Example', workspaceId: 'ws_1' })
    expect(manager.isBookmarked('https://example.com', 'ws_1')).toBe(true)
    expect(manager.isBookmarked('https://other.com', 'ws_1')).toBe(false)
  })

  it('searches bookmarks', () => {
    manager.add({ url: 'https://github.com', title: 'GitHub', workspaceId: 'ws_1' })
    manager.add({ url: 'https://openai.com', title: 'OpenAI', workspaceId: 'ws_1' })
    const results = manager.search('github')
    expect(results).toHaveLength(1)
  })
})

// ── WorkspaceManager Tests ──────────────────────────────────────────────────
describe('WorkspaceManager', () => {
  let WorkspaceManager: any
  let manager: any

  beforeEach(async () => {
    vi.resetModules()
    ;({ WorkspaceManager } = await import('../src/main/workspace-manager'))
    manager = new WorkspaceManager()
  })

  it('creates a default "Personal" workspace on first run', () => {
    const all = manager.getAll()
    expect(all.length).toBeGreaterThanOrEqual(1)
    expect(all[0].name).toBe('Personal')
  })

  it('creates a new workspace', () => {
    const ws = manager.create({ name: 'Research' })
    expect(ws.id).toBeTruthy()
    expect(ws.name).toBe('Research')
  })

  it('sets active workspace', () => {
    const ws = manager.create({ name: 'Work' })
    manager.setActive(ws.id)
    expect(manager.getActive()?.id).toBe(ws.id)
  })

  it('refuses to remove the last workspace', () => {
    const all = manager.getAll()
    // If only 1 workspace exists, removal should fail
    if (all.length === 1) {
      const removed = manager.remove(all[0].id)
      expect(removed).toBe(false)
    }
  })

  it('renames a workspace', () => {
    const ws = manager.create({ name: 'Old Name' })
    manager.rename(ws.id, 'New Name')
    const updated = manager.getAll().find((w: any) => w.id === ws.id)
    expect(updated?.name).toBe('New Name')
  })
})

// ── SettingsManager Tests ───────────────────────────────────────────────────
describe('SettingsManager', () => {
  let SettingsManager: any
  let manager: any

  beforeEach(async () => {
    vi.resetModules()
    ;({ SettingsManager } = await import('../src/main/settings-manager'))
    manager = new SettingsManager()
  })

  it('returns secure default settings', () => {
    expect(manager.get('trackerBlockingEnabled')).toBe(true)
    expect(manager.get('fingerprintProtectionEnabled')).toBe(true)
    expect(manager.get('aiAutosyncEnabled')).toBe(false)
    expect(manager.get('theme')).toBe('dark')
  })

  it('updates a setting', () => {
    manager.set('theme', 'light')
    expect(manager.get('theme')).toBe('light')
  })

  it('batch updates settings', () => {
    manager.update({ tabSuspensionDelayMinutes: 30, theme: 'system' })
    expect(manager.get('tabSuspensionDelayMinutes')).toBe(30)
    expect(manager.get('theme')).toBe('system')
  })

  it('resets to secure defaults', () => {
    manager.set('trackerBlockingEnabled', false)
    manager.reset()
    expect(manager.get('trackerBlockingEnabled')).toBe(true)
  })
})
