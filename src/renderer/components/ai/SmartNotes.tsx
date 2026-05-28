import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StickyNote, Sparkles, Save, Trash2, Loader2 } from 'lucide-react'
import { useAIInference } from '../../hooks/useAIInference'
import { cn } from '@securevision/ui'

interface SmartNotesProps {
  tabId: string
  pageUrl: string
}

const AUTOSAVE_DELAY_MS = 1500

/**
 * SmartNotes — per-tab AI-assisted notes with:
 *  - Auto-save (debounced 1.5s after last keystroke)
 *  - AI "improve" action: rewrites selected text via AI
 *  - Persists to localStorage keyed by tab URL
 */
export const SmartNotes: React.FC<SmartNotesProps> = ({ tabId, pageUrl }) => {
  const storageKey = `sv_notes_${encodeURIComponent(pageUrl)}`
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isImproving, setIsImproving] = useState(false)
  const [savedIndicator, setSavedIndicator] = useState(false)
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null)
  const { sendMessage, generateCompletion } = useAIInference()

  // Load saved notes for this URL
  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) setContent(saved)
  }, [storageKey])

  const save = useCallback(() => {
    setIsSaving(true)
    localStorage.setItem(storageKey, content)
    setTimeout(() => {
      setIsSaving(false)
      setSavedIndicator(true)
      setTimeout(() => setSavedIndicator(false), 2000)
    }, 300)
  }, [content, storageKey])

  // Debounced auto-save
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setContent(val)
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => {
      localStorage.setItem(storageKey, val)
      setSavedIndicator(true)
      setTimeout(() => setSavedIndicator(false), 1500)
    }, AUTOSAVE_DELAY_MS)
  }

  // AI: improve the notes content
  const handleAIImprove = async () => {
    if (!content.trim() || isImproving) return
    setIsImproving(true)
    try {
      // Use generateCompletion to avoid cluttering the chat history
      const improved = await generateCompletion(
        'You are an expert note-taker and editor.',
        `Please improve, format, and restructure these notes for maximum clarity and professionalism. Return ONLY the improved notes in raw markdown, with no intro or outro remarks:\n\n${content}`
      )
      
      if (improved) {
        setContent(improved)
        localStorage.setItem(storageKey, improved)
        setSavedIndicator(true)
        setTimeout(() => setSavedIndicator(false), 2000)
      }
    } catch (err) {
      console.error('[SmartNotes] AI Improve failed:', err)
    }
    setIsImproving(false)
  }

  const handleClear = () => {
    setContent('')
    localStorage.removeItem(storageKey)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/8">
        <div className="flex items-center gap-2">
          <StickyNote className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-semibold text-zinc-300">Smart Notes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <AnimatePresence>
            {savedIndicator && (
              <motion.span
                initial={{ opacity: 0, x: 4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="text-[10px] text-emerald-500"
              >
                Saved
              </motion.span>
            )}
          </AnimatePresence>

          <button
            onClick={handleAIImprove}
            disabled={isImproving || !content.trim()}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium
                       bg-violet-600/20 border border-violet-500/30 text-violet-300
                       hover:bg-violet-600/30 transition-colors disabled:opacity-40"
          >
            {isImproving
              ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
              : <Sparkles className="w-2.5 h-2.5" />
            }
            AI Improve
          </button>

          <button
            onClick={save}
            disabled={isSaving}
            className="p-1.5 rounded-lg hover:bg-white/8 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {isSaving
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <Save className="w-3 h-3" />
            }
          </button>

          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg hover:bg-red-500/15 text-zinc-600 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Notes textarea */}
      <textarea
        value={content}
        onChange={handleChange}
        placeholder="Take notes about this page…&#10;&#10;Tip: Select text and click ✨ AI Improve to clean up your notes."
        className="flex-1 bg-transparent p-3 text-sm text-zinc-300 placeholder:text-zinc-700
                   resize-none outline-none leading-relaxed font-mono"
      />

      {/* Footer hint */}
      <div className="px-3 py-1.5 border-t border-white/5">
        <p className="text-[9px] text-zinc-700">Notes saved per page URL · Auto-saves after typing stops</p>
      </div>
    </div>
  )
}
