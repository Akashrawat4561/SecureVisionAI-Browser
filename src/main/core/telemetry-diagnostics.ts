import { app, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

export interface TelemetryEvent {
  event: string
  timestamp: number
  payload: any
}

/**
 * Telemetry & Diagnostics Manager (Phase 15 — Public Beta Readiness)
 * 
 * Responsibilities:
 * 1. Collects structured logs, process diagnostics, and system stats.
 * 2. Enforces strict user privacy controls (opt-in/opt-out telemetry consent).
 * 3. Compiles and exports automated diagnostics bundles for developer diagnostics.
 */
export class TelemetryDiagnosticsManager {
  private logQueue: TelemetryEvent[] = []
  private telemetryConsent: boolean = false
  private diagnosticsLogPath: string

  constructor() {
    const userData = app.getPath('userData')
    this.diagnosticsLogPath = path.join(userData, 'telemetry_events.json')
    this.loadState()
  }

  private loadState() {
    try {
      if (fs.existsSync(this.diagnosticsLogPath)) {
        const raw = fs.readFileSync(this.diagnosticsLogPath, 'utf8')
        this.logQueue = JSON.parse(raw)
      }
    } catch {
      this.logQueue = []
    }
  }

  /**
   * Updates user opt-in/opt-out choice for privacy telemetry metrics collection
   */
  public setTelemetryConsent(optIn: boolean) {
    this.telemetryConsent = optIn
    console.log(`[Telemetry] User privacy consent updated: telemetryConsent = ${optIn}`)
    this.trackEvent('privacy_consent_updated', { consented: optIn })
  }

  /**
   * Tracks a secure diagnostic telemetry event if user consent is active
   */
  public trackEvent(event: string, payload: any = {}) {
    // Audit telemetry logic: Never collect data without consent, keeping zero-knowledge integrity
    if (!this.telemetryConsent && event !== 'privacy_consent_updated') {
      return
    }

    const newEvent: TelemetryEvent = {
      event,
      timestamp: Date.now(),
      payload: {
        ...payload,
        platform: process.platform,
        arch: process.arch,
        version: app.getVersion()
      }
    }

    this.logQueue.push(newEvent)

    // Keep logQueue size bounded to prevent memory leaks or disk inflation
    if (this.logQueue.length > 500) {
      this.logQueue.shift()
    }

    this.flushToDisk()
  }

  private flushToDisk() {
    try {
      fs.writeFileSync(this.diagnosticsLogPath, JSON.stringify(this.logQueue, null, 2), 'utf8')
    } catch (err) {
      console.error('[Telemetry] Failed to flush events to disk:', err)
    }
  }

  /**
   * Compiles all system metrics, GPU configurations, crash metrics, and diagnostics into a single export package
   */
  public generateDiagnosticsBundle(mainWindow: BrowserWindow): string {
    const memory = process.getProcessMemoryInfo()
    const systemMetrics = {
      timestamp: Date.now(),
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      nodeVersion: process.versions.node,
      os: process.platform,
      arch: process.arch,
      systemMemory: process.getSystemMemoryInfo(),
      processMemory: memory,
      cpuUsage: process.getCPUUsage(),
      activeWindows: BrowserWindow.getAllWindows().length,
      telemetryConsentActive: this.telemetryConsent
    }

    const bundle = {
      system: systemMetrics,
      logs: this.logQueue
    }

    const exportPath = path.join(app.getPath('downloads'), `securevision_diagnostics_${Date.now()}.json`)
    fs.writeFileSync(exportPath, JSON.stringify(bundle, null, 2), 'utf8')
    
    console.log(`[Telemetry] Diagnostics bundle compiled and written to: ${exportPath}`)
    return exportPath
  }

  public getConsent(): boolean {
    return this.telemetryConsent
  }
}

export const globalTelemetryManager = new TelemetryDiagnosticsManager()
