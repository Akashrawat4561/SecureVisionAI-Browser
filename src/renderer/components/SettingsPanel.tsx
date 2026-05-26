import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Shield, Cpu, Palette, Bell, RotateCcw, ChevronRight } from 'lucide-react'
import { BrowserSettings } from '@securevision/shared'
import { cn } from '@securevision/ui'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
  <motion.button
    onClick={() => !disabled && onChange(!checked)}
    className={cn(
      'relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0',
      checked ? 'bg-blue-600' : 'bg-zinc-700',
      disabled && 'opacity-40 cursor-not-allowed'
    )}
  >
    <motion.div
      className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md"
      animate={{ x: checked ? 16 : 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
    />
  </motion.button>
)

const SettingRow: React.FC<{
  label: string
  description?: string
  children: React.ReactNode
}> = ({ label, description, children }) => (
  <div className="flex items-center justify-between py-3.5 border-b border-white/5 last:border-0">
    <div className="flex-1 mr-4 min-w-0">
      <p className="text-sm text-zinc-200 font-medium">{label}</p>
      {description && <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">{description}</p>}
    </div>
    {children}
  </div>
)

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-2 pt-5 pb-2 mb-1">
    <div className="text-blue-400">{icon}</div>
    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{title}</h3>
  </div>
)

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<BrowserSettings | null>(null)

  useEffect(() => {
    if (isOpen) {
      window.electronAPI?.invoke?.('settings-get-all').then((s: BrowserSettings) => setSettings(s))
    }
  }, [isOpen])

  const updateSetting = <K extends keyof BrowserSettings>(key: K, value: BrowserSettings[K]) => {
    if (!settings) return
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    window.electronAPI?.send?.('settings-update', { [key]: value })
  }

  const handleReset = () => {
    window.electronAPI?.send?.('settings-reset')
    window.electronAPI?.invoke?.('settings-get-all').then((s: BrowserSettings) => setSettings(s))
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, x: 24, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="fixed right-0 top-0 h-full w-96 bg-zinc-900/97 backdrop-blur-2xl border-l border-white/10 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/8 shrink-0">
              <h2 className="text-base font-bold text-white">Settings</h2>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-zinc-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Settings Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {!settings ? (
                <div className="flex items-center justify-center h-32 text-zinc-600 text-sm">Loading settings…</div>
              ) : (
                <>
                  {/* Privacy & Security */}
                  <SectionHeader icon={<Shield className="w-3.5 h-3.5" />} title="Privacy & Security" />
                  <SettingRow
                    label="Tracker Blocking"
                    description="Block cross-site trackers, analytics pixels, and ad networks."
                  >
                    <Toggle checked={settings.trackerBlockingEnabled} onChange={(v) => updateSetting('trackerBlockingEnabled', v)} />
                  </SettingRow>
                  <SettingRow
                    label="Fingerprint Protection"
                    description="Randomize browser fingerprint to prevent cross-site identification."
                  >
                    <Toggle checked={settings.fingerprintProtectionEnabled} onChange={(v) => updateSetting('fingerprintProtectionEnabled', v)} />
                  </SettingRow>

                  {/* Performance */}
                  <SectionHeader icon={<Cpu className="w-3.5 h-3.5" />} title="Performance" />
                  <SettingRow
                    label="Tab Suspension"
                    description={`Automatically freeze tabs inactive for ${settings.tabSuspensionDelayMinutes} minutes to save RAM.`}
                  >
                    <select
                      value={settings.tabSuspensionDelayMinutes}
                      onChange={(e) => updateSetting('tabSuspensionDelayMinutes', Number(e.target.value))}
                      className="bg-zinc-800 border border-white/10 text-zinc-300 text-xs rounded-lg px-2 py-1.5 outline-none"
                    >
                      {[5, 10, 15, 30, 60].map((n) => (
                        <option key={n} value={n}>{n} min</option>
                      ))}
                    </select>
                  </SettingRow>

                  {/* AI */}
                  <SectionHeader icon={<Bell className="w-3.5 h-3.5" />} title="AI Assistant" />
                  <SettingRow
                    label="AI Auto-Sync"
                    description="Sync AI conversations across devices (requires sign-in). Off by default."
                  >
                    <Toggle checked={settings.aiAutosyncEnabled} onChange={(v) => updateSetting('aiAutosyncEnabled', v)} />
                  </SettingRow>

                  {/* Appearance */}
                  <SectionHeader icon={<Palette className="w-3.5 h-3.5" />} title="Appearance" />
                  <SettingRow label="Theme">
                    <div className="flex rounded-lg overflow-hidden border border-white/10">
                      {(['dark', 'light', 'system'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => updateSetting('theme', t)}
                          className={cn(
                            'px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                            settings.theme === t
                              ? 'bg-blue-600 text-white'
                              : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </SettingRow>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/8 shrink-0">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 text-xs text-zinc-500 hover:text-red-400 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset to Secure Defaults
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
