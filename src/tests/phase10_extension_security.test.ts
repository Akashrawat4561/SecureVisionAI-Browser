/**
 * Phase 10 — Extension Sandboxing & Brokered IPC Unit Tests
 * Test runner: Vitest
 */
import { describe, it, expect } from 'vitest'
import { ExtensionSecurityManager, ExtensionMetadata } from '../main/extension-security-manager'

describe('Extension Security Manager (Phase 10 Hardening)', () => {
  it('correctly registers capabilities and enforces deny-by-default', () => {
    const manager = new ExtensionSecurityManager()

    const ext: ExtensionMetadata = {
      id: 'sv-ext-id-123',
      name: 'SecureVision AI Helper',
      version: '1.0.0',
      permissions: ['tabs', 'storage'],
      isSigned: true
    }

    manager.registerExtension(ext)

    // Authorized API call (declared permission)
    const authTabs = manager.authorizeApiCall({
      extensionId: 'sv-ext-id-123',
      api: 'chrome.tabs.query',
      args: [{ active: true }]
    })
    expect(authTabs.authorized).toBe(true)

    // Blocked API call (undeclared permission -> privilege escalation)
    const authAI = manager.authorizeApiCall({
      extensionId: 'sv-ext-id-123',
      api: 'chrome.ai.generateText',
      args: ['Hello']
    })
    expect(authAI.authorized).toBe(false)
    expect(authAI.reason).toContain('Privilege Escalation Blocked')
  })

  it('blocks prototype pollution and script injection attacks', () => {
    const manager = new ExtensionSecurityManager()

    const ext: ExtensionMetadata = {
      id: 'sv-ext-id-123',
      name: 'SecureVision Helper',
      version: '1.0.0',
      permissions: ['storage'],
      isSigned: true
    }

    manager.registerExtension(ext)

    // Attempted script injection inside args
    const authInjection = manager.authorizeApiCall({
      extensionId: 'sv-ext-id-123',
      api: 'chrome.storage.local.set',
      args: [{ maliciousPayload: '<script>alert(1)</script>' }]
    })
    expect(authInjection.authorized).toBe(false)
    expect(authInjection.reason).toContain('Script payload injection signature')

    // Attempted prototype pollution
    const authPollution = manager.authorizeApiCall({
      extensionId: 'sv-ext-id-123',
      api: 'chrome.storage.local.set',
      args: [{ '__proto__': { admin: true } }]
    })
    expect(authPollution.authorized).toBe(false)
    expect(authPollution.reason).toContain('Prototype pollution attempt')
  })
})
