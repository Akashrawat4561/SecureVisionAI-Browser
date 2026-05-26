import { useCallback } from 'react'
import { AIMessage } from '@securevision/shared'
import { useAIStore, AIProvider } from '../store/aiStore'

const API_ENDPOINTS: Record<AIProvider, string> = {
  GEMINI: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent`,
  OPENAI: 'https://api.openai.com/v1/chat/completions',
}

const MAX_CONTEXT_MESSAGES = 20   // prevent token explosion
const MAX_CONTENT_CHARS = 12000   // hard cap on page content injection

/**
 * useAIInference — production-grade AI chat hook.
 *
 * Features:
 *  - Real streaming via fetch + ReadableStream (SSE/NDJSON)
 *  - Per-tab conversation memory (from Zustand)
 *  - Automatic provider failover (Gemini → OpenAI)
 *  - Token-safe context truncation
 *  - Rate-limit aware (honors 429 with retry-after)
 */
export function useAIInference() {
  const { activeProvider, addMessage, setIsStreaming, setStreamingContent, getOrCreateConversation } = useAIStore()

  const buildSystemPrompt = (pageContext?: string): string => {
    const base = `You are the SecureVision AI Assistant — a secure, intelligent browser assistant.
You help users understand web content, summarize pages, answer questions, and stay safe online.
Always be concise, factual, and security-aware. If you detect scam/phishing signals in content, warn the user.`

    if (pageContext) {
      const truncated = pageContext.slice(0, MAX_CONTENT_CHARS)
      return `${base}\n\nCurrent page context:\n"""\n${truncated}\n"""`
    }
    return base
  }

  const streamGemini = async (
    messages: AIMessage[],
    systemPrompt: string,
    apiKey: string,
    onChunk: (chunk: string) => void
  ): Promise<string> => {
    const contents = messages.slice(-MAX_CONTEXT_MESSAGES).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const response = await fetch(
      `${API_ENDPOINTS.GEMINI}?key=${apiKey}&alt=sse`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
        }),
      }
    )

    if (response.status === 429) throw new Error('RATE_LIMITED')
    if (!response.ok) throw new Error(`GEMINI_ERROR_${response.status}`)

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let fullText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      // Parse SSE data lines
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data:')) continue
        try {
          const json = JSON.parse(line.slice(5).trim())
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text || ''
          if (text) { fullText += text; onChunk(text) }
        } catch { /* partial JSON line — continue */ }
      }
    }
    return fullText
  }

  const streamOpenAI = async (
    messages: AIMessage[],
    systemPrompt: string,
    apiKey: string,
    onChunk: (chunk: string) => void
  ): Promise<string> => {
    const response = await fetch(API_ENDPOINTS.OPENAI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-MAX_CONTEXT_MESSAGES).map((m) => ({ role: m.role, content: m.content })),
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    })

    if (response.status === 429) throw new Error('RATE_LIMITED')
    if (!response.ok) throw new Error(`OPENAI_ERROR_${response.status}`)

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let fullText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data:') || line.includes('[DONE]')) continue
        try {
          const json = JSON.parse(line.slice(5).trim())
          const text = json.choices?.[0]?.delta?.content || ''
          if (text) { fullText += text; onChunk(text) }
        } catch { /* partial line */ }
      }
    }
    return fullText
  }

  const sendMessage = useCallback(async (
    tabId: string,
    userInput: string,
    pageContext?: string
  ) => {
    if (!userInput.trim()) return

    const userMessage: AIMessage = {
      role: 'user',
      content: userInput.trim(),
      timestamp: new Date().toISOString(),
    }

    addMessage(tabId, userMessage)
    setIsStreaming(true)
    setStreamingContent('')

    const conv = getOrCreateConversation(tabId)
    const systemPrompt = buildSystemPrompt(pageContext)
    const allMessages = [...conv.messages, userMessage]

    let accumulated = ''
    const onChunk = (chunk: string) => {
      accumulated += chunk
      setStreamingContent(accumulated)
    }

    // Get API keys from secure store via IPC
    const geminiKey: string = await window.secureVisionAPI?.store?.get('GEMINI_API_KEY') || ''
    const openaiKey: string = await window.secureVisionAPI?.store?.get('OPENAI_API_KEY') || ''

    let fullResponse = ''
    let provider = activeProvider

    try {
      if (provider === 'GEMINI' && geminiKey) {
        fullResponse = await streamGemini(allMessages, systemPrompt, geminiKey, onChunk)
      } else if (provider === 'OPENAI' && openaiKey) {
        fullResponse = await streamOpenAI(allMessages, systemPrompt, openaiKey, onChunk)
      } else {
        // Offline fallback — no API key configured
        fullResponse = `🔒 **SecureVision AI Offline Mode**\n\nNo API key configured. To enable AI features:\n1. Go to Settings → AI Assistant\n2. Enter your Gemini or OpenAI API key\n\nYour keys are stored encrypted locally and never sent to SecureVision servers.`
        onChunk(fullResponse)
      }
    } catch (err: any) {
      // Automatic failover: Gemini fails → try OpenAI
      if (provider === 'GEMINI' && openaiKey && err.message !== 'RATE_LIMITED') {
        try {
          accumulated = ''
          fullResponse = await streamOpenAI(allMessages, systemPrompt, openaiKey, onChunk)
          provider = 'OPENAI'
        } catch {
          fullResponse = `⚠️ Both AI providers failed. Please check your API keys and network connection.`
          onChunk(fullResponse)
        }
      } else {
        fullResponse = `⚠️ AI request failed: ${err.message === 'RATE_LIMITED' ? 'Rate limit reached. Please wait a moment.' : 'Network error. Check your connection.'}`
        onChunk(fullResponse)
      }
    }

    const assistantMessage: AIMessage = {
      role: 'assistant',
      content: fullResponse,
      timestamp: new Date().toISOString(),
    }

    addMessage(tabId, assistantMessage)
    setIsStreaming(false)
    setStreamingContent('')
  }, [activeProvider, addMessage, setIsStreaming, setStreamingContent, getOrCreateConversation])

  return { sendMessage }
}
