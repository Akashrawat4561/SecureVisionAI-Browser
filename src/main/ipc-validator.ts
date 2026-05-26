import { z } from 'zod'
import { ipcMain } from 'electron'

/**
 * Zod Schemas for IPC Argument Validation
 * This prevents Renderer processes from sending malicious payload shapes to the Main process.
 */

// ── SEND CHANNELS SCHEMAS ────────────────────────────────────────────────────────
export const sendChannelSchemas: Record<string, z.ZodTypeAny> = {
  'open-new-tab': z.tuple([z.string().optional()]).or(z.tuple([])),
  'close-tab': z.tuple([z.string()]),
  'switch-tab': z.tuple([z.string()]),
  'update-view-bounds': z.tuple([
    z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    }),
  ]),
  'cancel-download': z.tuple([z.string()]),
  'browser-new-tab': z.tuple([
    z.object({
      url: z.string().url().or(z.literal('securevision://newtab')).optional(),
      active: z.boolean().optional()
    }).optional()
  ]).or(z.tuple([])),
  'browser-close-tab': z.tuple([z.string().uuid()]),
  'browser-switch-tab': z.tuple([z.string().uuid()]),
  'browser-navigate': z.tuple([z.string().uuid(), z.string().url()]),
  'browser-go-back': z.tuple([z.string().uuid()]),
  'browser-go-forward': z.tuple([z.string().uuid()]),
  'browser-reload': z.tuple([z.string().uuid()]),
  'settings-update': z.tuple([z.object({}).catchall(z.any())]),
  'history-clear': z.tuple([]),
  'bookmarks-remove': z.tuple([z.string()]),
  'navigate-active-tab': z.tuple([z.string()]),
  'workspaces-set-active': z.tuple([z.string()]),
  'workspaces-remove': z.tuple([z.string()]),
  'workspaces-rename': z.tuple([
    z.object({
      id: z.string(),
      name: z.string(),
    }),
  ]),
  'tab-focus-search': z.tuple([]),
  'devtools-toggle': z.tuple([]),
  'app-quit': z.tuple([]),
  'telemetry-set-consent': z.tuple([z.boolean()]),
  'telemetry-track-event': z.tuple([z.string(), z.any().optional()]),
  'updates-set-channel': z.tuple([z.enum(['stable', 'beta', 'nightly'])])
}

// ── INVOKE CHANNELS SCHEMAS ──────────────────────────────────────────────────────
export const invokeChannelSchemas: Record<string, z.ZodTypeAny> = {
  'browser-get-tabs': z.tuple([]),
  'browser-get-active-tab': z.tuple([]),
  'secure-store-get': z.tuple([z.string()]),
  'secure-store-update-theme': z.tuple([z.object({ theme: z.string() })]),
  'secure-store-update-ai-settings': z.tuple([z.object({ settings: z.any() })]),
  'settings-get-all': z.tuple([]),
  'history-get-recent': z.tuple([z.number().optional()]),
  'history-search': z.tuple([z.string()]),
  'bookmarks-get': z.tuple([z.string()]),
  'bookmarks-search': z.tuple([z.string()]),
  'bookmarks-add': z.tuple([z.any()]),
  'workspaces-get-all': z.tuple([]),
  'workspaces-get-active': z.tuple([]),
  'workspaces-create': z.tuple([z.any()]),
  'get-page-content': z.tuple([]),
  'extensions-get': z.tuple([]),
  'extensions-toggle': z.tuple([z.string()]),
  'ai-infer': z.tuple([
    z.array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string()
      })
    ).max(50)
  ]),
  'telemetry-get-consent': z.tuple([]),
  'telemetry-export-diagnostics': z.tuple([]),
  'updates-check': z.tuple([])
}

export function applyIpcHardening() {
  const originalOn = ipcMain.on.bind(ipcMain)
  const originalHandle = ipcMain.handle.bind(ipcMain)

  // @ts-ignore - Override on
  ipcMain.on = (channel: string, listener: (...args: any[]) => void) => {
    return originalOn(channel, (event, ...args) => {
      const schema = sendChannelSchemas[channel]
      if (!schema) {
        console.warn(`[IPC SECURITY BLOCK] Unregistered SEND channel: ${channel}`)
        return // Block execution
      }
      try {
        schema.parse(args)
        listener(event, ...args)
      } catch (err: any) {
        if (err.errors) {
          console.error(`[IPC SECURITY BLOCK] Malformed payload on ${channel}:`, err.errors)
        } else {
          console.error(`[IPC ERROR] Error in ${channel} listener:`, err)
        }
      }
    })
  }

  // @ts-ignore - Override handle
  ipcMain.handle = (channel: string, listener: (...args: any[]) => any) => {
    return originalHandle(channel, async (event, ...args) => {
      const schema = invokeChannelSchemas[channel]
      if (!schema) {
        console.warn(`[IPC SECURITY BLOCK] Unregistered INVOKE channel: ${channel}`)
        throw new Error('Unregistered channel')
      }
      try {
        schema.parse(args)
        return await listener(event, ...args)
      } catch (err: any) {
        console.error(`[IPC SECURITY BLOCK] Malformed payload on ${channel}:`, err.errors)
        throw new Error('Invalid payload')
      }
    })
  }

  console.log('[Security] IPC Zod Validation Layer Active.')
}
