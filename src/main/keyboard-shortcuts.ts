import { globalShortcut, BrowserWindow } from 'electron'

export interface ShortcutDefinition {
  id: string
  accelerator: string
  description: string
  handler: () => void
}

/**
 * KeyboardShortcutRegistry — centralised Electron global shortcut manager.
 *
 * Design:
 *  - All shortcuts registered/unregistered as a group (no leaking accelerators)
 *  - Deregisters all on window blur, re-registers on focus (respects OS shortcuts)
 *  - Shortcut IDs allow external override/disable by feature flags
 */
export class KeyboardShortcutRegistry {
  private shortcuts: Map<string, ShortcutDefinition> = new Map()
  private registered = false

  public define(def: ShortcutDefinition) {
    if (this.shortcuts.has(def.accelerator)) {
      console.warn(`[Shortcuts] Conflict: accelerator "${def.accelerator}" already registered as "${this.shortcuts.get(def.accelerator)?.id}"`)
      return
    }
    this.shortcuts.set(def.accelerator, def)
  }

  public registerAll() {
    if (this.registered) return
    for (const [accelerator, def] of this.shortcuts.entries()) {
      try {
        const success = globalShortcut.register(accelerator, def.handler)
        if (!success) {
          console.warn(`[Shortcuts] Failed to register: ${accelerator} (${def.id}) — possibly taken by OS`)
        }
      } catch (e) {
        console.error(`[Shortcuts] Error registering ${accelerator}:`, e)
      }
    }
    this.registered = true
  }

  public unregisterAll() {
    globalShortcut.unregisterAll()
    this.registered = false
  }

  public disable(shortcutId: string) {
    for (const [accelerator, def] of this.shortcuts.entries()) {
      if (def.id === shortcutId) {
        globalShortcut.unregister(accelerator)
      }
    }
  }

  public getAll(): ShortcutDefinition[] {
    return Array.from(this.shortcuts.values())
  }
}

/**
 * Builds and returns the standard SecureVision shortcut registry bound
 * to the given main window and tab/workspace action callbacks.
 */
export function createShortcutRegistry(
  mainWindow: BrowserWindow,
  actions: {
    newTab: () => void
    closeTab: () => void
    reloadTab: () => void
    toggleDevTools: () => void
    openCommandPalette: () => void
    focusAddressBar: () => void
  }
): KeyboardShortcutRegistry {
  const registry = new KeyboardShortcutRegistry()

  registry.define({
    id: 'new-tab',
    accelerator: 'CommandOrControl+T',
    description: 'Open a new tab',
    handler: actions.newTab,
  })

  registry.define({
    id: 'close-tab',
    accelerator: 'CommandOrControl+W',
    description: 'Close the active tab',
    handler: actions.closeTab,
  })

  registry.define({
    id: 'reload-tab',
    accelerator: 'CommandOrControl+R',
    description: 'Reload the active tab',
    handler: actions.reloadTab,
  })

  registry.define({
    id: 'command-palette',
    accelerator: 'CommandOrControl+K',
    description: 'Open the Command Palette',
    handler: () => {
      mainWindow.webContents.send('open-command-palette')
    },
  })

  registry.define({
    id: 'focus-address-bar',
    accelerator: 'CommandOrControl+L',
    description: 'Focus the address bar',
    handler: () => {
      mainWindow.webContents.send('focus-address-bar')
    },
  })

  registry.define({
    id: 'toggle-devtools',
    accelerator: 'F12',
    description: 'Toggle Developer Tools',
    handler: actions.toggleDevTools,
  })

  return registry
}
