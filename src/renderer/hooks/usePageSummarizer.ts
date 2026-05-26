import { useCallback, useState } from 'react'
import { useAIInference } from './useAIInference'

export type SummaryMode = 'brief' | 'bullets' | 'tldr' | 'safety'

const SUMMARY_PROMPTS: Record<SummaryMode, string> = {
  brief: 'Provide a clear 2-3 sentence summary of the main content of this page.',
  bullets: 'Summarize this page as exactly 5 concise bullet points. Be specific and factual.',
  tldr: 'Give me a one-sentence TL;DR of this page. Be extremely concise.',
  safety: `Analyze this page for security concerns. Check for:
- Phishing signals (fake login, urgency pressure, suspicious links)
- Scam patterns (fake prizes, too-good offers, impersonation)
- Privacy risks (excessive data collection, dark patterns)
- Misinformation markers
Report findings clearly. If the page appears safe, say so explicitly.`,
}

/**
 * usePageSummarizer — extracts the current page's text content
 * via Electron IPC and fires a structured AI summarization prompt.
 *
 * The page content is injected as context into the AI system prompt
 * (see useAIInference buildSystemPrompt). Max 12,000 chars enforced there.
 */
export function usePageSummarizer() {
  const { sendMessage } = useAIInference()
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [lastSummaryMode, setLastSummaryMode] = useState<SummaryMode | null>(null)

  const getPageContent = async (): Promise<string> => {
    // IPC call to Main Process to execute JS in the active BrowserView
    const content = await window.secureVisionAPI?.browser?.getPageContent?.()
    return typeof content === 'string' ? content : ''
  }

  const summarize = useCallback(async (tabId: string, mode: SummaryMode = 'brief') => {
    if (isSummarizing) return
    setIsSummarizing(true)
    setLastSummaryMode(mode)

    try {
      const pageContent = await getPageContent()
      const prompt = SUMMARY_PROMPTS[mode]
      await sendMessage(tabId, prompt, pageContent)
    } finally {
      setIsSummarizing(false)
    }
  }, [isSummarizing, sendMessage])

  return { summarize, isSummarizing, lastSummaryMode }
}
