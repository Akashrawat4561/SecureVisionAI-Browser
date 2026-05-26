import React, { useState } from 'react'
import { Send, Globe, Database, Activity } from 'lucide-react'

export const RestApiTester: React.FC = () => {
  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/todos/1')
  const [response, setResponse] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<number | null>(null)
  const [latency, setLatency] = useState<number | null>(null)

  const handleSend = async () => {
    setIsLoading(true)
    const startTime = performance.now()
    try {
      const res = await fetch(url, { method })
      const data = await res.json()
      setStatus(res.status)
      setResponse(data)
    } catch (err: any) {
      setStatus(500)
      setResponse({ error: err.message })
    } finally {
      setLatency(Math.round(performance.now() - startTime))
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 text-sm">
      <div className="flex items-center gap-3 p-3 border-b border-zinc-800 bg-zinc-900">
        <select 
          value={method} 
          onChange={(e) => setMethod(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 text-white rounded px-2 py-1 outline-none font-semibold text-xs"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </select>
        
        <input 
          type="text" 
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-1 outline-none focus:border-blue-500 font-mono text-xs"
          placeholder="https://api.example.com/v1/resource"
        />
        
        <button 
          onClick={handleSend}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded flex items-center gap-2 font-medium disabled:opacity-50 transition-colors"
        >
          <Send className="w-3.5 h-3.5" /> Send
        </button>
      </div>
      
      <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
        <div className="flex justify-between items-center text-xs text-zinc-400 uppercase font-semibold tracking-wider">
          <span>Response</span>
          <div className="flex items-center gap-4">
            <span className={`flex items-center gap-1 ${status && status >= 400 ? 'text-red-400' : 'text-emerald-400'}`}>
              <Globe className="w-3.5 h-3.5" /> Status: {status || '---'}
            </span>
            <span className="flex items-center gap-1 text-blue-400">
              <Activity className="w-3.5 h-3.5" /> Time: {latency ? `${latency}ms` : '---'}
            </span>
          </div>
        </div>
        
        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg p-3 overflow-auto font-mono text-xs text-zinc-300">
          {isLoading ? (
            <div className="animate-pulse flex gap-2"><Activity className="w-4 h-4 text-zinc-600" /> Fetching...</div>
          ) : response ? (
            <pre>{JSON.stringify(response, null, 2)}</pre>
          ) : (
            <div className="text-zinc-600 text-center mt-10">Send a request to see the response</div>
          )}
        </div>
      </div>
    </div>
  )
}
