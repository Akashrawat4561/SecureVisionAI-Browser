import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Focus, Play, Pause, X, CheckCircle2 } from 'lucide-react'

interface FocusModeProps {
  isActive: boolean
  onToggle: () => void
}

export const FocusModeOverlay: React.FC<FocusModeProps> = ({ isActive, onToggle }) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60) // 25 minutes default
  const [isRunning, setIsRunning] = useState(false)
  const [sessionCount, setSessionCount] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    } else if (timeLeft === 0) {
      setIsRunning(false)
      setSessionCount((s) => s + 1)
      // Automatically switch to 5 min break
      setTimeLeft(5 * 60)
      // Send notification via Electron IPC if needed
      window.secureVisionAPI?.telemetry?.logInfo('FocusMode', 'Session completed')
    }
    return () => clearInterval(interval)
  }, [isRunning, timeLeft])

  if (!isActive) return null

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 right-4 z-50 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl w-64"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Focus className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">Focus Mode</span>
          </div>
          <button onClick={onToggle} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-center mb-6">
          <div className="text-4xl font-mono font-light text-white tracking-wider">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <div className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-medium">
            Remaining
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl flex items-center justify-center gap-2 transition-colors font-medium text-sm"
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isRunning ? 'Pause' : 'Start Focus'}
          </button>
        </div>

        {sessionCount > 0 && (
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
            <span>Sessions completed today</span>
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> {sessionCount}
            </span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
