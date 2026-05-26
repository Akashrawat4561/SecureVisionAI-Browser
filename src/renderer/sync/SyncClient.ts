import { useTabStore } from '../store/tabStore'

/**
 * SecureVision Cloud Sync Client (E2EE)
 * 
 * Responsibilities:
 * 1. Authenticate with Central Sync Server
 * 2. Encrypt/Decrypt payloads using AES-256-GCM locally (Zero-Knowledge)
 * 3. Connect via WebSockets for real-time synchronization
 */

export class SyncClient {
  private ws: WebSocket | null = null
  private token: string | null = null
  private encryptionKey: CryptoKey | null = null

  // For Phase 7/9, we derive a key from a master password and user-specific dynamic salt.
  public async deriveKey(password: string, salt: string) {
    const encoder = new TextEncoder()
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    )
    
    // Convert hex string salt from server to Uint8Array
    const saltBytes = encoder.encode(salt)
    
    this.encryptionKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    )
  }

  public async encryptPayload(data: any): Promise<string> {
    if (!this.encryptionKey) throw new Error('No encryption key derived')
    const iv = window.crypto.getRandomValues(new Uint8Array(12))
    const encoded = new TextEncoder().encode(JSON.stringify(data))
    
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      encoded
    )
    
    // Format: base64(iv):base64(ciphertext)
    const ivB64 = btoa(String.fromCharCode(...iv))
    const cipherB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)))
    return `${ivB64}:${cipherB64}`
  }

  public async decryptPayload(encryptedPayload: string): Promise<any> {
    if (!this.encryptionKey) throw new Error('No encryption key derived')
    const [ivB64, cipherB64] = encryptedPayload.split(':')
    
    const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0))
    const ciphertext = Uint8Array.from(atob(cipherB64), c => c.charCodeAt(0))
    
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      ciphertext
    )
    
    return JSON.parse(new TextDecoder().decode(decrypted))
  }

  public connect(token: string) {
    this.token = token
    this.ws = new WebSocket(`ws://localhost:4000?token=${token}`)
    
    this.ws.onopen = () => {
      console.log('[SyncClient] Connected to Sync Server.')
    }
    
    this.ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data)
      if (msg.type === 'STATE_UPDATED') {
        console.log('[SyncClient] Received remote state update.')
        
        if (msg.state.bookmarks) {
          const decryptedBookmarks = await this.decryptPayload(msg.state.bookmarks)
          console.log('[SyncClient] Decrypted incoming bookmarks:', decryptedBookmarks)
          // Integration: Dispatch to BookmarksManager via IPC or Zustand
        }
      }
    }
    
    this.ws.onclose = () => {
      console.log('[SyncClient] Disconnected. Reconnecting in 5s...')
      setTimeout(() => this.connect(token), 5000)
    }
  }

  public async pushState(state: { bookmarks?: any, history?: any }, version: number) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    
    const encryptedBookmarks = state.bookmarks ? await this.encryptPayload(state.bookmarks) : null
    const encryptedHistory = state.history ? await this.encryptPayload(state.history) : null
    
    this.ws.send(JSON.stringify({
      type: 'PUSH_STATE',
      bookmarks: encryptedBookmarks,
      history: encryptedHistory,
      version,
      timestamp: Date.now() // Replay protection timestamp
    }))
  }
}

export const globalSyncClient = new SyncClient()
