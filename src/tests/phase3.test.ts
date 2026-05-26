/**
 * Phase 3 Unit Tests — AI Sidebar & Contextual Memory
 * Test runner: Vitest
 *
 * Coverage:
 *  - AI Store (Zustand) — conversations, active tab mapping, message addition
 *  - Markdown Renderer — XSS safety, code block formatting
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useAIStore } from '../src/renderer/store/aiStore'

// Minimal inline re-implementation of the renderer from ChatMessage for pure Node testing
function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-white/10 px-1 rounded text-xs font-mono text-blue-300">$1</code>')
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold text-zinc-200 mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-sm font-bold text-zinc-100 mt-3 mb-1">$1</h2>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-zinc-300">$1</li>')
    .replace(/\n/g, '<br/>')
}

describe('AI Store (Zustand)', () => {
  beforeEach(() => {
    useAIStore.setState({
      conversations: {},
      isOpen: false,
      activeTabId: null,
      activeProvider: 'GEMINI',
      isStreaming: false,
      streamingContent: '',
    })
  })

  it('creates a new conversation for a tab', () => {
    const store = useAIStore.getState()
    const conv = store.getOrCreateConversation('tab_1')
    
    expect(conv.id).toContain('conv_tab_1')
    expect(conv.messages).toHaveLength(0)
    expect(conv.provider).toBe('GEMINI')
  })

  it('isolates memory per tab', () => {
    const store = useAIStore.getState()
    
    // Add message to tab 1
    store.addMessage('tab_1', { role: 'user', content: 'Hello Tab 1', timestamp: '' })
    
    // Check tab 2
    const conv2 = store.getOrCreateConversation('tab_2')
    
    // Assert isolation
    const updatedStore = useAIStore.getState()
    expect(updatedStore.conversations['tab_1'].messages).toHaveLength(1)
    expect(updatedStore.conversations['tab_2'].messages).toHaveLength(0)
  })

  it('calculates approximate token usage', () => {
    const store = useAIStore.getState()
    // Roughly length/4 tokens
    const longString = 'a'.repeat(40) // 10 tokens
    store.addMessage('tab_1', { role: 'user', content: longString, timestamp: '' })
    
    const conv = useAIStore.getState().conversations['tab_1']
    expect(conv.tokenCount).toBeGreaterThanOrEqual(10)
  })

  it('clears conversation history', () => {
    const store = useAIStore.getState()
    store.addMessage('tab_1', { role: 'user', content: 'Hello', timestamp: '' })
    store.clearConversation('tab_1')
    
    const conv = useAIStore.getState().conversations['tab_1']
    expect(conv.messages).toHaveLength(0)
    expect(conv.tokenCount).toBe(0)
  })
})

describe('Markdown Renderer (XSS & formatting)', () => {
  it('escapes HTML tags to prevent XSS', () => {
    const input = '<script>alert(1)</script>'
    const output = renderMarkdown(input)
    expect(output).not.toContain('<script>')
    expect(output).toContain('&lt;script&gt;')
  })

  it('formats bold and italic text', () => {
    const input = 'This is **bold** and *italic*'
    const output = renderMarkdown(input)
    expect(output).toContain('<strong>bold</strong>')
    expect(output).toContain('<em>italic</em>')
  })

  it('formats inline code blocks', () => {
    const input = 'Use `npm run dev` to start'
    const output = renderMarkdown(input)
    expect(output).toContain('<code')
    expect(output).toContain('npm run dev</code>')
  })

  it('formats bullet points', () => {
    const input = '- Item 1\n- Item 2'
    const output = renderMarkdown(input)
    expect(output).toContain('<li')
    expect(output).toContain('Item 1</li>')
    expect(output).toContain('Item 2</li>')
  })
})
