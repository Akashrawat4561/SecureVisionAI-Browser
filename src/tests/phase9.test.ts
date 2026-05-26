/**
 * Phase 9 Unit Tests — Production Hardening & IPC Validation
 * Test runner: Vitest
 */
import { describe, it, expect, vi } from 'vitest'
import { sendChannelSchemas, invokeChannelSchemas } from '../src/main/ipc-validator'

describe('IPC Zod Validator', () => {
  it('allows valid browser-navigate payloads', () => {
    const payload = ['123e4567-e89b-12d3-a456-426614174000', 'https://secure.com']
    expect(() => sendChannelSchemas['browser-navigate'].parse(payload)).not.toThrow()
  })

  it('rejects invalid URL in browser-navigate', () => {
    const payload = ['123e4567-e89b-12d3-a456-426614174000', 'not-a-url']
    expect(() => sendChannelSchemas['browser-navigate'].parse(payload)).toThrow()
  })

  it('rejects invalid UUID in browser-close-tab', () => {
    const payload = ['invalid-uuid']
    expect(() => sendChannelSchemas['browser-close-tab'].parse(payload)).toThrow()
  })

  it('restricts ai-infer payload length (DDoS protection)', () => {
    const hugePayload = [
      Array.from({ length: 100 }).map(() => ({ role: 'user', content: 'spam' }))
    ]
    expect(() => invokeChannelSchemas['ai-infer'].parse(hugePayload)).toThrow()
  })
})
