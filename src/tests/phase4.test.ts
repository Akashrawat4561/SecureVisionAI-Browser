/**
 * Phase 4 Unit Tests — Security Engine
 * Test runner: Vitest
 *
 * Coverage:
 *  - URL Interception (webRequest.onBeforeRequest)
 *  - Fingerprint protection (User-Agent masking)
 *  - Phishing & Scam heuristic block triggering
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the security core
vi.mock('@securevision/security-core', () => ({
  globalEvaluator: {
    evaluateUrl: vi.fn(async (url: string) => {
      if (url.includes('phishing.com')) {
        return { score: 95, category: 'PHISHING', details: ['Fake login detected'] }
      }
      return { score: 0, category: 'SAFE', details: [] }
    }),
  }
}))

describe('SecurityEngine', () => {
  let SecurityEngine: any
  let engine: any
  let mockSession: any
  let mockWebContents: any

  beforeEach(async () => {
    vi.resetModules()
    
    // Setup Session Mocks
    mockSession = {
      webRequest: {
        onBeforeRequest: vi.fn(),
        onBeforeSendHeaders: vi.fn(),
      }
    }

    // Setup WebContents Mocks
    mockWebContents = {
      on: vi.fn(),
      send: vi.fn(),
      loadURL: vi.fn(),
    }

    const mod = await import('../src/main/security-engine')
    SecurityEngine = mod.SecurityEngine
    engine = new SecurityEngine()
  })

  it('blocks known tracker domains when enabled', () => {
    engine.updateConfig({ trackerBlocking: true })
    engine.attachToSession(mockSession)
    
    const onBeforeRequest = mockSession.webRequest.onBeforeRequest.mock.calls[0][0]
    
    // Simulate tracker request
    const callbackMock = vi.fn()
    onBeforeRequest({ url: 'https://google-analytics.com/collect' }, callbackMock)
    
    expect(callbackMock).toHaveBeenCalledWith({ cancel: true })
  })

  it('allows tracker domains when disabled', () => {
    engine.updateConfig({ trackerBlocking: false })
    engine.attachToSession(mockSession)
    
    const onBeforeRequest = mockSession.webRequest.onBeforeRequest.mock.calls[0][0]
    
    const callbackMock = vi.fn()
    onBeforeRequest({ url: 'https://google-analytics.com/collect' }, callbackMock)
    
    expect(callbackMock).toHaveBeenCalledWith({}) // Not canceled
  })

  it('masks User-Agent when fingerprint protection is enabled', () => {
    engine.updateConfig({ fingerprintProtection: true })
    engine.attachToSession(mockSession)
    
    const onBeforeSendHeaders = mockSession.webRequest.onBeforeSendHeaders.mock.calls[0][0]
    
    const details = {
      requestHeaders: {
        'User-Agent': 'MyCustomBrowser/1.0',
        'Sec-CH-UA': 'Chrome',
        'Accept': '*/*'
      }
    }
    const callbackMock = vi.fn()
    
    onBeforeSendHeaders(details, callbackMock)
    
    const modifiedHeaders = callbackMock.mock.calls[0][0].requestHeaders
    expect(modifiedHeaders['User-Agent']).toContain('Windows NT 10.0') // Masked
    expect(modifiedHeaders['Sec-CH-UA']).toBeUndefined() // Stripped
    expect(modifiedHeaders['Accept']).toBe('*/*') // Preserved
  })

  it('intercepts phishing URLs and injects warning page', async () => {
    engine.attachToWebContents(mockWebContents)
    
    const onWillNavigate = mockWebContents.on.mock.calls.find((c: any) => c[0] === 'will-navigate')[1]
    
    const preventDefault = vi.fn()
    
    // Simulate safe navigation
    await onWillNavigate({ preventDefault }, 'https://github.com')
    expect(preventDefault).not.toHaveBeenCalled()
    expect(mockWebContents.send).not.toHaveBeenCalled()
    
    // Simulate phishing navigation
    await onWillNavigate({ preventDefault }, 'https://phishing.com/login')
    expect(preventDefault).toHaveBeenCalled()
    expect(mockWebContents.send).toHaveBeenCalledWith('security-alert', expect.objectContaining({
      score: 95,
      category: 'PHISHING'
    }))
    expect(mockWebContents.loadURL).toHaveBeenCalledWith(expect.stringContaining('Threat Score: 95/100'))
  })
})
