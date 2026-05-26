import React, { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Send, Loader2, Mic, Sparkles } from 'lucide-react'
import { cn } from '@securevision/ui'

interface ChatInputProps {
  onSend: (message: string) => void
  isStreaming: boolean
  disabled?: boolean
}

const QUICK_PROMPTS = [
  { label: '📋 Summarize', prompt: 'Summarize the content on this page in 3 bullet points.' },
  { label: '🔍 Explain', prompt: 'Explain the main topic of this page simply.' },
  { label: '⚠️ Check safety', prompt: 'Does this page show any signs of phishing, scam, or deception?' },
  { label: '✍️ Rewrite', prompt: 'Rewrite the selected text to be clearer and more concise.' },
]

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, isStreaming, disabled }) => {
  const [value, setValue] = useState('')
  const [showQuickPrompts, setShowQuickPrompts] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed || isStreaming) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    // Auto-resize textarea
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  return (
    <div className="flex flex-col gap-1.5 p-3 border-t border-white/8">
      {/* Quick prompts toggle */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setShowQuickPrompts((p) => !p)}
          className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          <Sparkles className="w-3 h-3" />
          Quick Actions
        </button>
      </div>

      {/* Quick prompt chips */}
      {showQuickPrompts && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="flex flex-wrap gap-1.5 pb-1"
        >
          {QUICK_PROMPTS.map((qp) => (
            <button
              key={qp.label}
              onClick={() => {
                onSend(qp.prompt)
                setShowQuickPrompts(false)
              }}
              disabled={isStreaming}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/8 border border-white/10
                         text-zinc-400 hover:text-white hover:bg-white/14 transition-all disabled:opacity-40"
            >
              {qp.label}
            </button>
          ))}
        </motion.div>
      )}

      {/* Input area */}
      <div className={cn(
        'flex items-end gap-2 rounded-2xl border p-2 transition-all',
        disabled || isStreaming
          ? 'bg-white/4 border-white/6 opacity-60'
          : 'bg-white/8 border-white/12 focus-within:border-blue-500/50 focus-within:bg-white/10'
      )}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about this page…"
          disabled={disabled || isStreaming}
          rows={1}
          className="flex-1 bg-transparent outline-none resize-none text-sm text-zinc-200
                     placeholder:text-zinc-600 leading-relaxed max-h-[120px] min-h-[24px]"
        />

        <div className="flex items-center gap-1 flex-shrink-0 pb-0.5">
          {/* Voice button (Phase 3 foundation) */}
          <button
            disabled
            title="Voice input — coming soon"
            className="p-1.5 rounded-lg text-zinc-700 cursor-not-allowed"
          >
            <Mic className="w-3.5 h-3.5" />
          </button>

          {/* Send button */}
          <motion.button
            whileHover={!isStreaming && value.trim() ? { scale: 1.08 } : {}}
            whileTap={!isStreaming && value.trim() ? { scale: 0.92 } : {}}
            onClick={handleSubmit}
            disabled={!value.trim() || isStreaming || disabled}
            className={cn(
              'p-1.5 rounded-xl transition-colors flex items-center justify-center',
              value.trim() && !isStreaming
                ? 'bg-blue-600 text-white hover:bg-blue-500'
                : 'bg-white/8 text-zinc-600 cursor-not-allowed'
            )}
          >
            {isStreaming
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Send className="w-3.5 h-3.5" />
            }
          </motion.button>
        </div>
      </div>

      <p className="text-[9px] text-zinc-700 px-1">
        Shift+Enter for new line · Enter to send
      </p>
    </div>
  )
}
