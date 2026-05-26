import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, X, Settings2, Moon, Sun, Type } from 'lucide-react'
import { usePageSummarizer } from '../../hooks/usePageSummarizer'

interface ReadingModeProps {
  isOpen: boolean
  onClose: () => void
}

export const ReadingModeOverlay: React.FC<ReadingModeProps> = ({ isOpen, onClose }) => {
  const [content, setContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  
  // Reading preferences
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>('dark')
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans'>('serif')
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      // Extract raw text from active tab
      window.secureVisionAPI?.browser?.getPageContent?.().then((text: any) => {
        setContent(typeof text === 'string' ? text : 'Could not extract content from this page.')
        setIsLoading(false)
      })
    } else {
      setContent('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const getThemeClasses = () => {
    switch(theme) {
      case 'light': return 'bg-[#fcfaf8] text-gray-900'
      case 'sepia': return 'bg-[#f4ecd8] text-[#5b4636]'
      case 'dark': default: return 'bg-[#111111] text-gray-300'
    }
  }

  const getFontSizeClass = () => {
    switch(fontSize) {
      case 'small': return 'text-sm'
      case 'large': return 'text-xl'
      case 'medium': default: return 'text-base'
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex justify-center"
      >
        <div className={`w-full max-w-3xl h-full flex flex-col shadow-2xl relative ${getThemeClasses()} transition-colors duration-300`}>
          
          {/* Header Controls */}
          <div className={`flex items-center justify-between p-4 sticky top-0 ${theme === 'dark' ? 'bg-[#111]/90' : theme === 'sepia' ? 'bg-[#f4ecd8]/90' : 'bg-[#fcfaf8]/90'} backdrop-blur-md z-10 border-b ${theme === 'dark' ? 'border-white/10' : 'border-black/5'}`}>
            <div className="flex items-center gap-2 opacity-60">
              <BookOpen className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Reading Mode</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'} transition-colors`}
                >
                  <Settings2 className="w-5 h-5" />
                </button>

                {/* Typography Popover */}
                <AnimatePresence>
                  {showSettings && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className={`absolute right-0 top-12 w-64 p-4 rounded-xl shadow-xl border ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-gray-200'} z-20 flex flex-col gap-4`}
                    >
                      {/* Theme */}
                      <div>
                        <div className="text-xs font-semibold mb-2 opacity-50 uppercase tracking-wider">Theme</div>
                        <div className="flex gap-2">
                          <button onClick={() => setTheme('light')} className="flex-1 py-1 rounded bg-gray-100 text-gray-900 border border-gray-200 flex justify-center"><Sun className="w-4 h-4"/></button>
                          <button onClick={() => setTheme('sepia')} className="flex-1 py-1 rounded bg-[#f4ecd8] text-[#5b4636] border border-[#e4dcc8] flex justify-center"><Sun className="w-4 h-4 opacity-50"/></button>
                          <button onClick={() => setTheme('dark')} className="flex-1 py-1 rounded bg-zinc-900 text-white border border-zinc-700 flex justify-center"><Moon className="w-4 h-4"/></button>
                        </div>
                      </div>
                      
                      {/* Font Size */}
                      <div>
                        <div className="text-xs font-semibold mb-2 opacity-50 uppercase tracking-wider">Size</div>
                        <div className="flex gap-2">
                          <button onClick={() => setFontSize('small')} className={`flex-1 py-1 rounded border ${theme === 'dark' ? 'border-zinc-700' : 'border-gray-200'} text-sm`}>A</button>
                          <button onClick={() => setFontSize('medium')} className={`flex-1 py-1 rounded border ${theme === 'dark' ? 'border-zinc-700' : 'border-gray-200'} text-base`}>A</button>
                          <button onClick={() => setFontSize('large')} className={`flex-1 py-1 rounded border ${theme === 'dark' ? 'border-zinc-700' : 'border-gray-200'} text-lg`}>A</button>
                        </div>
                      </div>

                      {/* Font Family */}
                      <div>
                        <div className="text-xs font-semibold mb-2 opacity-50 uppercase tracking-wider">Style</div>
                        <div className="flex gap-2">
                          <button onClick={() => setFontFamily('sans')} className={`flex-1 py-1.5 rounded border ${theme === 'dark' ? 'border-zinc-700' : 'border-gray-200'} font-sans`}>Sans</button>
                          <button onClick={() => setFontFamily('serif')} className={`flex-1 py-1.5 rounded border ${theme === 'dark' ? 'border-zinc-700' : 'border-gray-200'} font-serif`}>Serif</button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button 
                onClick={onClose}
                className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'} transition-colors`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Reading Content */}
          <div className={`flex-1 overflow-y-auto px-12 py-10 ${fontFamily === 'serif' ? 'font-serif' : 'font-sans'}`}>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 opacity-50 animate-pulse">
                <BookOpen className="w-8 h-8 mb-4" />
                <p>Extracting article text...</p>
              </div>
            ) : (
              <div className={`mx-auto max-w-prose leading-relaxed ${getFontSizeClass()}`}>
                {content.split('\n\n').map((paragraph, idx) => (
                  <p key={idx} className="mb-6">{paragraph.trim()}</p>
                ))}
                
                {content.length === 0 && (
                  <p className="text-center italic opacity-50">No readable text found on this page.</p>
                )}
              </div>
            )}
          </div>
          
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
