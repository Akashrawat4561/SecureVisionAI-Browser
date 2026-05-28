import { Session, WebContents, ipcMain } from 'electron'
import { globalEvaluator } from '@securevision/security-core'

/**
 * SecurityEngine — Core background threat analysis and interception pipeline.
 *
 * Responsibilities:
 *  - URL & redirection interception
 *  - Phishing & scam heuristic analysis
 *  - Tracker blocking (webRequest)
 *  - Browser fingerprint protection
 */
export class SecurityEngine {
  private trackerDomains: Set<string> = new Set()
  private isTrackerBlockingEnabled = true
  private isFingerprintProtectionEnabled = true

  constructor() {
    // A tiny sample blocklist for demonstration
    this.trackerDomains = new Set([
      'google-analytics.com',
      'doubleclick.net',
      'facebook.net',
      'tracker.example.com',
    ])
  }

  public updateConfig(config: { trackerBlocking?: boolean; fingerprintProtection?: boolean }) {
    if (config.trackerBlocking !== undefined) this.isTrackerBlockingEnabled = config.trackerBlocking
    if (config.fingerprintProtection !== undefined) this.isFingerprintProtectionEnabled = config.fingerprintProtection
  }

  /**
   * Binds security interceptors to a specific Electron Session (e.g., Workspace or Incognito).
   */
  public attachToSession(session: Session) {
    // 1. Tracker Blocking via webRequest API
    session.webRequest.onBeforeRequest((details, callback) => {
      if (!this.isTrackerBlockingEnabled) return callback({})

      try {
        const urlObj = new URL(details.url)
        const domain = urlObj.hostname.replace(/^www\./, '')

        // Simple heuristic: block requests to known tracker domains
        for (const tracker of this.trackerDomains) {
          if (domain === tracker || domain.endsWith(`.${tracker}`)) {
            console.log(`[SecurityEngine] Blocked tracker request: ${details.url}`)
            return callback({ cancel: true })
          }
        }
      } catch {
        // Invalid URL
      }
      callback({})
    })

    // 2. Fingerprint Protection via User-Agent randomization
    session.webRequest.onBeforeSendHeaders((details, callback) => {
      if (this.isFingerprintProtectionEnabled) {
        // Obfuscate OS and browser version to reduce fingerprint entropy
        details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        
        // Strip out dangerous/identifying headers
        delete details.requestHeaders['Sec-CH-UA']
        delete details.requestHeaders['Sec-CH-UA-Mobile']
        delete details.requestHeaders['Sec-CH-UA-Platform']
      }
      callback({ requestHeaders: details.requestHeaders })
    })
  }

  /**
   * Binds navigation interceptors to a specific WebContents (a BrowserView/Tab).
   */
  public attachToWebContents(webContents: WebContents) {
    // 3. Real-time URL Interception Pipeline
    webContents.on('will-navigate', async (event, url) => {
      const result = await globalEvaluator.evaluateUrl(url)

      if (result.score >= 70) {
        // CRITICAL or HIGH threat detected!
        event.preventDefault()
        console.warn(`[SecurityEngine] Blocked navigation to dangerous URL: ${url} (Score: ${result.score})`)

        // Fire alert IPC to renderer
        webContents.send('security-alert', {
          url,
          score: result.score,
          category: result.category,
          message: result.details[0] || 'Malicious heuristic detected',
        })

        // Redirect to local Warning Page
        const warningUrl = `securevision://warning?url=${encodeURIComponent(url)}&score=${result.score}&category=${encodeURIComponent(result.category)}`
        // We simulate loading the warning page. In a real app, we use custom protocol or loadFile
        // For Phase 4, we'll just inject an HTML string for speed and security.
        this.injectWarningPage(webContents, url, result)
      }
    })
  }

  private injectWarningPage(webContents: WebContents, blockedUrl: string, result: any) {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Security Warning</title>
        <style>
          body { background: #09090b; color: #fff; font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: rgba(255,0,0,0.1); border: 1px solid rgba(255,0,0,0.2); padding: 40px; border-radius: 16px; max-width: 500px; text-align: center; }
          h1 { color: #ef4444; font-size: 24px; margin-top: 0; }
          p { color: #a1a1aa; font-size: 14px; line-height: 1.5; }
          .score { display: inline-block; background: #ef4444; color: white; padding: 4px 12px; border-radius: 12px; font-weight: bold; font-size: 12px; margin: 10px 0; }
          .btn { background: #3f3f46; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; margin-top: 20px; font-weight: 500; }
          .btn:hover { background: #52525b; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Website Blocked</h1>
          <div class="score">Threat Score: ${result.score}/100</div>
          <p>SecureVision AI prevented access to <strong>${blockedUrl}</strong> because it matches known <strong>${result.category}</strong> signatures.</p>
          <p><em>${result.details[0] || 'Stay safe out there.'}</em></p>
          <button class="btn" onclick="window.history.back()">Go Back to Safety</button>
        </div>
      </body>
      </html>
    `
    webContents.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  }
}

export const securityEngine = new SecurityEngine()
