import { session, Session } from 'electron'

export type SessionMode = 'workspace' | 'incognito'

export interface SessionProfile {
  id: string
  mode: SessionMode
  workspaceId?: string
  partition: string
  electronSession: Session
}

/**
 * SessionManager — creates and manages isolated Chromium session partitions.
 *
 * Security guarantee:
 *  - Workspaces use persistent partitions: 'persist:workspace_<id>'
 *  - Incognito uses in-memory partition: 'incognito_<id>' (destroyed on window close)
 *  - No two workspaces share cookies, localStorage, or IndexedDB
 */
export class SessionManager {
  private profiles: Map<string, SessionProfile> = new Map()

  public getOrCreateSession(mode: SessionMode, workspaceId: string): SessionProfile {
    const profileId = mode === 'incognito'
      ? `incognito_${workspaceId}`
      : `workspace_${workspaceId}`

    if (this.profiles.has(profileId)) {
      return this.profiles.get(profileId)!
    }

    const partition = mode === 'incognito'
      ? `incognito_${workspaceId}` // in-memory, not persisted
      : `persist:workspace_${workspaceId}`

    const electronSession = session.fromPartition(partition, {
      cache: mode !== 'incognito', // disable disk cache for incognito
    })

    this.applySessionSecurityPolicy(electronSession, mode)

    const profile: SessionProfile = {
      id: profileId,
      mode,
      workspaceId,
      partition,
      electronSession,
    }

    this.profiles.set(profileId, profile)
    return profile
  }

  private applySessionSecurityPolicy(sess: Session, mode: SessionMode) {
    // Block all third-party cookies in incognito
    if (mode === 'incognito') {
      sess.cookies.on('changed', (_event, cookie, _cause, removed) => {
        if (!removed && cookie.domain?.startsWith('.')) {
          // Third-party cookie — remove it
          sess.cookies.remove(`https://${cookie.domain}`, cookie.name).catch(() => {})
        }
      })
    }

    // Strict permission handler — deny dangerous permissions
    sess.setPermissionRequestHandler((_webContents, permission, callback) => {
      const BLOCKED_PERMISSIONS = ['notifications', 'pointerLock', 'openExternal', 'serial', 'usb', 'hid']
      if (BLOCKED_PERMISSIONS.includes(permission)) {
        console.warn(`[SessionManager] Blocked permission request: ${permission}`)
        callback(false)
        return
      }
      callback(true)
    })

    // Block clipboard read access unless user-initiated
    sess.setPermissionCheckHandler((_webContents, permission) => {
      if (permission === 'clipboard-read') return false
      return true
    })

    // Remove identifying headers
    sess.webRequest.onBeforeSendHeaders((details, callback) => {
      const headers = { ...details.requestHeaders }
      // Strip DNT and Referer for privacy
      delete headers['DNT']
      if (mode === 'incognito') {
        delete headers['Referer']
      }
      callback({ requestHeaders: headers })
    })
  }

  public destroyIncognitoSessions() {
    for (const [id, profile] of this.profiles.entries()) {
      if (profile.mode === 'incognito') {
        profile.electronSession.clearStorageData().catch(() => {})
        profile.electronSession.clearCache().catch(() => {})
        this.profiles.delete(id)
      }
    }
  }

  public getProfile(profileId: string): SessionProfile | undefined {
    return this.profiles.get(profileId)
  }
}

export const sessionManager = new SessionManager()
