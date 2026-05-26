/**
 * Phase 7 Unit Tests — Cloud Sync & E2EE
 * Test runner: Vitest
 *
 * Coverage:
 *  - E2EE Local Encryption (AES-GCM)
 *  - PBKDF2 Key Derivation
 *  - Sync Client serialization/deserialization
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// We need to polyfill Web Crypto for Node.js environment in Vitest
import { webcrypto } from 'crypto'
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as any
}

import { SyncClient } from '../src/renderer/sync/SyncClient'

describe('SyncClient E2EE Encryption', () => {
  let client: SyncClient

  beforeEach(() => {
    client = new SyncClient()
  })

  it('fails to encrypt if key is not derived', async () => {
    await expect(client.encryptPayload({ foo: 'bar' })).rejects.toThrow('No encryption key derived')
  })

  it('derives key from password', async () => {
    await client.deriveKey('super-secret-master-password')
    // We expect internal state to hold the key
    expect((client as any).encryptionKey).toBeDefined()
  })

  it('encrypts and decrypts payloads seamlessly', async () => {
    await client.deriveKey('super-secret-master-password')
    
    const originalPayload = {
      bookmarks: [
        { id: '1', title: 'React', url: 'https://react.dev' },
        { id: '2', title: 'Vue', url: 'https://vuejs.org' }
      ]
    }
    
    // Encrypt
    const encryptedString = await client.encryptPayload(originalPayload)
    
    // Ciphertext format should be iv:ciphertext
    expect(typeof encryptedString).toBe('string')
    expect(encryptedString).toContain(':')
    expect(encryptedString).not.toContain('React') // Ensure plain text is not visible
    
    // Decrypt
    const decryptedPayload = await client.decryptPayload(encryptedString)
    
    // Compare
    expect(decryptedPayload).toEqual(originalPayload)
  })

  it('throws error when decrypting with wrong key', async () => {
    await client.deriveKey('correct-password')
    const encryptedString = await client.encryptPayload({ secret: 'data' })
    
    // Create new client instance with wrong password
    const maliciousClient = new SyncClient()
    await maliciousClient.deriveKey('wrong-password')
    
    await expect(maliciousClient.decryptPayload(encryptedString)).rejects.toThrow()
  })
})
