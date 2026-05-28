import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import { BrowserSettings } from '@securevision/shared'

const DEFAULT_SETTINGS: BrowserSettings = {
  incognito: false,
  trackerBlockingEnabled: true,
  fingerprintProtectionEnabled: true,
  aiAutosyncEnabled: false, // opt-in only
  tabSuspensionDelayMinutes: 15,
  theme: 'dark',
  GEMINI_API_KEY: '',
  OPENAI_API_KEY: '',
}

/**
 * SettingsManager — type-safe settings store persisted to userData.
 *
 * Security defaults:
 *  - Tracker blocking: ON
 *  - Fingerprint protection: ON
 *  - AI autosync: OFF (user must explicitly enable)
 *  - Tab suspension: 15 minutes (memory safety)
 */
export class SettingsManager {
  private readonly filePath: string
  private settings: BrowserSettings

  constructor() {
    this.filePath = path.join(app.getPath('userData'), 'securevision-settings.json')
    this.settings = this.load()
  }

  private load(): BrowserSettings {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'))
        // Merge with defaults to handle missing new keys across upgrades
        return { ...DEFAULT_SETTINGS, ...raw }
      }
    } catch {
      // Corrupt file — fall back to secure defaults
    }
    return { ...DEFAULT_SETTINGS }
  }

  private save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.settings, null, 2), 'utf-8')
    } catch (e) {
      console.error('[SettingsManager] Failed to save settings:', e)
    }
  }

  public get<K extends keyof BrowserSettings>(key: K): BrowserSettings[K] {
    return this.settings[key]
  }

  public set<K extends keyof BrowserSettings>(key: K, value: BrowserSettings[K]) {
    this.settings[key] = value
    this.save()
  }

  public getAll(): BrowserSettings {
    return { ...this.settings }
  }

  public update(partial: Partial<BrowserSettings>) {
    this.settings = { ...this.settings, ...partial }
    this.save()
  }

  public reset() {
    this.settings = { ...DEFAULT_SETTINGS }
    this.save()
  }
}

export const settingsManager = new SettingsManager()
