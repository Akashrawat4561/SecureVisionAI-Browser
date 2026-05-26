import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit2, Check } from 'lucide-react'
import { Workspace } from '@securevision/shared'
import { cn } from '@securevision/ui'

export const WorkspaceSwitcher: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    // Load workspaces from Main via IPC
    window.electronAPI?.invoke?.('workspaces-get-all').then((ws: Workspace[]) => {
      setWorkspaces(ws || [])
    })
    window.electronAPI?.invoke?.('workspaces-get-active').then((ws: Workspace | null) => {
      if (ws) setActiveId(ws.id)
    })
  }, [])

  const handleSwitchWorkspace = (wsId: string) => {
    setActiveId(wsId)
    window.electronAPI?.send?.('workspaces-set-active', wsId)
  }

  const handleCreateWorkspace = () => {
    window.electronAPI?.invoke?.('workspaces-create', { name: 'New Space' }).then((ws: Workspace) => {
      if (ws) setWorkspaces((prev) => [...prev, ws])
    })
  }

  const handleRename = (wsId: string) => {
    if (!editName.trim()) return
    window.electronAPI?.send?.('workspaces-rename', { id: wsId, name: editName.trim() })
    setWorkspaces((prev) => prev.map((w) => (w.id === wsId ? { ...w, name: editName.trim() } : w)))
    setEditingId(null)
    setEditName('')
  }

  return (
    <div className="flex flex-col gap-1 px-2 pt-4 pb-2">
      {/* Header */}
      <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-2 mb-1">
        Workspaces
      </p>

      <AnimatePresence>
        {workspaces.map((ws) => {
          const isActive = ws.id === activeId
          const isEditing = editingId === ws.id

          return (
            <motion.div
              key={ws.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              onClick={() => !isEditing && handleSwitchWorkspace(ws.id)}
              className={cn(
                'group relative flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer transition-all duration-150',
                isActive
                  ? 'bg-white/12 shadow-sm'
                  : 'hover:bg-white/6 text-zinc-400 hover:text-zinc-200'
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <motion.div
                  layoutId="workspace-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                  style={{ backgroundColor: ws.color }}
                />
              )}

              {/* Workspace Icon Badge */}
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 shadow-sm"
                style={{ backgroundColor: ws.color + '22', border: `1px solid ${ws.color}44` }}
              >
                <span>{ws.icon}</span>
              </div>

              {/* Name / Edit input */}
              {isEditing ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(ws.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-transparent border-b border-white/20 outline-none text-xs text-zinc-200 pb-0.5"
                />
              ) : (
                <span className={cn('flex-1 text-xs font-medium truncate', isActive ? 'text-white' : '')}>
                  {ws.name}
                </span>
              )}

              {/* Actions */}
              <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
                {isEditing ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRename(ws.id) }}
                    className="p-1 rounded-md hover:bg-white/10 text-emerald-400"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingId(ws.id)
                      setEditName(ws.name)
                    }}
                    className="p-1 rounded-md hover:bg-white/10 text-zinc-500 hover:text-zinc-300"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (workspaces.length <= 1) {
                      alert('Cannot delete the last workspace.')
                      return
                    }
                    window.electronAPI?.send?.('workspaces-remove', ws.id)
                    setWorkspaces((prev) => prev.filter((w) => w.id !== ws.id))
                  }}
                  className="p-1 rounded-md hover:bg-red-500/20 text-zinc-600 hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* Add Workspace */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleCreateWorkspace}
        className="mt-1 flex items-center gap-2 px-2.5 py-2 rounded-xl text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-all duration-150 text-xs font-medium border border-dashed border-white/10 hover:border-white/20"
      >
        <Plus className="w-3.5 h-3.5" />
        New Workspace
      </motion.button>
    </div>
  )
}
