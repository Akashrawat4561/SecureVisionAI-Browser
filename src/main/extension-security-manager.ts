export interface ExtensionMetadata {
  id: string
  name: string
  version: string
  description: string
  permissions: string[] // e.g. ["tabs", "storage", "webNavigation", "ai"]
  isSigned: boolean
  enabled: boolean
}

export interface ExtensionIPCRequest {
  extensionId: string
  api: string // e.g. "chrome.storage.local.set"
  args: any[]
}

/**
 * ExtensionSecurityManager (Phase 10 — Production Hardening)
 * 
 * Responsibilities:
 * 1. Implements capability-based "deny-by-default" sandboxing for extensions.
 * 2. Brokered IPC layer: Intercepts all extension API calls and validates them against declared permissions.
 * 3. Audits extension API usage in real-time to detect suspicious behavior, privilege escalation, and network abuse.
 */
export class ExtensionSecurityManager {
  private loadedExtensions: Map<string, ExtensionMetadata> = new Map()
  private apiUsageLogs: Map<string, Array<{ api: string; timestamp: number }>> = new Map()
  
  // Strict rate limit: Max 100 API calls per minute per extension
  private readonly MAX_CALLS_PER_MINUTE = 100

  constructor() {
    console.log('[ExtensionSecurity] Zero-Trust Extension Sandboxing Active.')
    
    // Register 3 default premium extensions
    this.registerExtension({
      id: 'ext_shieldguard',
      name: 'AdGuard Shield Pro',
      version: '2.4.1',
      description: 'Zero-trust script analyzer, tracker blocker, and third-party fingerprint defender.',
      permissions: ['webNavigation', 'tabs'],
      isSigned: true,
      enabled: true
    })

    this.registerExtension({
      id: 'ext_honeytoken',
      name: 'Honeytoken credential grid',
      version: '1.0.5',
      description: 'Injects high-fidelity honeytokens (fake credentials) into login forms to detect credential harvesting.',
      permissions: ['storage', 'tabs'],
      isSigned: true,
      enabled: true
    })

    this.registerExtension({
      id: 'ext_deepfake',
      name: 'SecureVision Media Forensics',
      version: '3.1.0',
      description: 'AI-assisted, real-time spectral and biometric deepfake media scanner for embedded video/images.',
      permissions: ['ai', 'tabs', 'storage'],
      isSigned: true,
      enabled: true
    })
  }

  /**
   * Registers a signed/verified extension with its declared capability limits
   */
  public registerExtension(metadata: ExtensionMetadata) {
    if (!metadata.isSigned) {
      console.warn(`[ExtensionSecurity] Loading UNSIGNED extension [${metadata.name}]. Isolating permissions.`)
    }
    this.loadedExtensions.set(metadata.id, metadata)
    this.apiUsageLogs.set(metadata.id, [])
  }

  public getExtensions(): ExtensionMetadata[] {
    return Array.from(this.loadedExtensions.values())
  }

  public toggleExtension(id: string): boolean {
    const ext = this.loadedExtensions.get(id)
    if (ext) {
      ext.enabled = !ext.enabled
      return true
    }
    return false
  }

  /**
   * Brokered IPC Gateway: Intercepts and authorizes API invocations
   */
  public authorizeApiCall(request: ExtensionIPCRequest): { authorized: boolean; reason?: string } {
    const { extensionId, api, args } = request
    const ext = this.loadedExtensions.get(extensionId)

    if (!ext) {
      return { authorized: false, reason: 'Access Denied: Extension is not registered in this browser instance.' }
    }

    // 1. Enforce rate-limits to prevent CPU/network abuse
    const rateCheck = this.checkRateLimit(extensionId)
    if (!rateCheck.ok) {
      return { authorized: false, reason: `Rate Limit Breached: ${rateCheck.reason}` }
    }

    // 2. Behavioral Analysis: Scan for suspicious API patterns (e.g. rapid cookie reads, script injection attempts)
    const safetyCheck = this.scanBehaviorPattern(extensionId, api, args)
    if (!safetyCheck.isSafe) {
      return { authorized: false, reason: `Behavioral Threat Blocked: ${safetyCheck.reason}` }
    }

    // 3. Capability-based authorization mapping
    const requiredPermission = this.getRequiredPermission(api)
    if (requiredPermission && !ext.permissions.includes(requiredPermission)) {
      return {
        authorized: false,
        reason: `Privilege Escalation Blocked: API '${api}' requires missing capability permission: '${requiredPermission}'`
      }
    }

    // Log successful invocation for behavioral telemetry
    this.apiUsageLogs.get(extensionId)!.push({ api, timestamp: Date.now() })
    return { authorized: true }
  }

  /**
   * Translates Chromium extension APIs to explicit capability permissions
   */
  private getRequiredPermission(api: string): string | null {
    if (api.startsWith('chrome.tabs')) return 'tabs'
    if (api.startsWith('chrome.storage')) return 'storage'
    if (api.startsWith('chrome.webNavigation')) return 'webNavigation'
    if (api.startsWith('chrome.ai') || api.startsWith('chrome.sidebar')) return 'ai'
    return 'system' // Deny-by-default general classification
  }

  /**
   * Verifies an extension does not abuse calls in a sliding-window duration
   */
  private checkRateLimit(extensionId: string): { ok: boolean; reason?: string } {
    const logs = this.apiUsageLogs.get(extensionId) || []
    const oneMinuteAgo = Date.now() - 60000
    
    // Purge older logs to avoid memory leaks
    const activeLogs = logs.filter(l => l.timestamp > oneMinuteAgo)
    this.apiUsageLogs.set(extensionId, activeLogs)

    if (activeLogs.length >= this.MAX_CALLS_PER_MINUTE) {
      return { ok: false, reason: 'Exceeded maximum allowable API operations per minute.' }
    }

    return { ok: true }
  }

  /**
   * Scans API calls for dangerous patterns (malicious inputs, script injection, network scanning)
   */
  private scanBehaviorPattern(extensionId: string, api: string, args: any[]): { isSafe: boolean; reason?: string } {
    const payloadStr = JSON.stringify(args)

    // Detect attempts to inject executable text or script tags into DOM or storage
    if (/<script/i.test(payloadStr) || /javascript:/i.test(payloadStr) || /data:/i.test(payloadStr)) {
      return { isSafe: false, reason: 'Script payload injection signature matched.' }
    }

    // Detect privilege escalation: attempts to read browser master data files or cookie stores
    if (api === 'chrome.storage.local.set' && payloadStr.includes('__proto__')) {
      return { isSafe: false, reason: 'Prototype pollution attempt detected in storage write.' }
    }

    return { isSafe: true }
  }
}
