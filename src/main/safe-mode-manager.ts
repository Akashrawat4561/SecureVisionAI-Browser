import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

/**
 * SafeModeManager (Phase 13 — Real World Resilience)
 * 
 * Responsibilities:
 * 1. Tracks consecutive startup cycles to detect crash loops.
 * 2. If consecutive crash count is >= 2, flags isSafeModeActive = true.
 * 3. Enforces app-wide survival degradation:
 *    - Disables GPU Hardware Acceleration (avoids driver crashes).
 *    - Disables third-party Chrome extensions and sideloading.
 *    - Reduces memory budgets and forces instant low-memory pruning.
 */
export class SafeModeManager {
  private crashLogPath: string
  private isSafeModeActive: boolean = false

  constructor() {
    // Write state to the app user data directory
    const userData = app.getPath('userData')
    this.crashLogPath = path.join(userData, 'startup_history.json')
    this.evaluateStartupSafety()
  }

  /**
   * Evaluates startup cycle counts to decide if Safe Mode needs to be activated
   */
  private evaluateStartupSafety() {
    try {
      let state = { consecutiveCrashes: 0, lastStartup: Date.now() }
      
      if (fs.existsSync(this.crashLogPath)) {
        state = JSON.parse(fs.readFileSync(this.crashLogPath, 'utf8'))
      }

      const now = Date.now()
      // If the app crashed within 15 seconds of the last start, treat as a crash loop
      if (now - state.lastStartup < 15000) {
        state.consecutiveCrashes += 1
      } else {
        state.consecutiveCrashes = 0 // Safe start Reset
      }

      state.lastStartup = now
      fs.writeFileSync(this.crashLogPath, JSON.stringify(state), 'utf8')

      if (state.consecutiveCrashes >= 2) {
        this.isSafeModeActive = true
        console.error(`[SafeMode] Safe Recovery Mode TRIGGERED! Consecutive crash count: ${state.consecutiveCrashes}`)
        
        // Anti-Crash Measure: Completely disable GPU Hardware Acceleration
        app.disableHardwareAcceleration()
      }
    } catch (err) {
      console.error('[SafeMode] Failed to evaluate startup safety:', err)
    }
  }

  /**
   * Reset the startup crash counter on successful fully hydrated launch
   */
  public reportSuccessfulLaunch() {
    try {
      if (fs.existsSync(this.crashLogPath)) {
        const state = JSON.parse(fs.readFileSync(this.crashLogPath, 'utf8'))
        state.consecutiveCrashes = 0
        fs.writeFileSync(this.crashLogPath, JSON.stringify(state), 'utf8')
      }
      console.log('[SafeMode] Reported clean startup. Consecutive crash counter cleared.')
    } catch (err) {
      console.error('[SafeMode] Error reporting successful launch:', err)
    }
  }

  public shouldDisableExtensions(): boolean {
    return this.isSafeModeActive
  }

  public shouldDisableGpu(): boolean {
    return this.isSafeModeActive
  }

  public shouldEnableDegradedPerformance(): boolean {
    return this.isSafeModeActive
  }

  public isActive(): boolean {
    return this.isSafeModeActive
  }
}

export const globalSafeModeManager = new SafeModeManager()
