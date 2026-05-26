import React from 'react'
import { motion } from 'framer-motion'
import { Bot, User, Copy, Check } from 'lucide-react'
import { AIMessage } from '@securevision/shared'
import { cn } from '@securevision/ui'

interface ChatMessageProps {
  message: AIMessage
  isStreaming?: boolean
}

// Minimal safe markdown renderer (no external dependency)
function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') // XSS sanitize
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-white/10 px-1 rounded text-xs font-mono text-blue-300">$1</code>')
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold text-zinc-200 mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-sm font-bold text-zinc-100 mt-3 mb-1">$1</h2>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-zinc-300">$1</li>')
    .replace(/\n/g, '<br/>')
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isStreaming }) => {
  const [copied, setCopied] = React.useState(false)
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'group flex gap-2.5 px-3 py-2',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div className={cn(
        'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
        isUser ? 'bg-blue-600/80' : 'bg-gradient-to-br from-violet-600 to-blue-600'
      )}>
        {isUser
          ? <User className="w-3.5 h-3.5 text-white" />
          : <Bot className="w-3.5 h-3.5 text-white" />
        }
      </div>

      {/* Bubble */}
      <div className={cn(
        'relative max-w-[85%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed',
        isUser
          ? 'bg-blue-600/90 text-white rounded-tr-sm'
          : 'bg-white/8 border border-white/10 text-zinc-200 rounded-tl-sm'
      )}>
        {isAssistant ? (
          <div
            className="prose-sm"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
          />
        ) : (
          <p>{message.content}</p>
        )}

        {/* Streaming cursor */}
        {isStreaming && isAssistant && (
          <span className="inline-block w-1.5 h-4 bg-blue-400 ml-0.5 animate-pulse rounded-sm align-middle" />
        )}

        {/* Copy button */}
        {isAssistant && !isStreaming && (
          <button
            onClick={handleCopy}
            className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity
                       w-6 h-6 rounded-full bg-zinc-700 border border-white/10 flex items-center justify-center"
          >
            {copied
              ? <Check className="w-3 h-3 text-emerald-400" />
              : <Copy className="w-3 h-3 text-zinc-400" />
            }
          </button>
        )}

        {/* Timestamp */}
        <p className={cn(
          'text-[9px] mt-1 select-none',
          isUser ? 'text-blue-200/60 text-right' : 'text-zinc-600'
        )}>
          {new Date(message.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  )
}

// Streaming placeholder bubble while AI is generating
export const StreamingBubble: React.FC<{ content: string }> = ({ content }) => {
  if (!content) {
    return (
      <div className="flex gap-2.5 px-3 py-2">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center flex-shrink-0">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="bg-white/8 border border-white/10 rounded-2xl rounded-tl-sm px-3 py-2.5 flex gap-1 items-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-zinc-500"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <ChatMessage
      message={{ role: 'assistant', content, timestamp: new Date().toISOString() }}
      isStreaming
    />
  )
}
