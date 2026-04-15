'use client'

import { useState } from 'react'
import type { Highlight } from '@/lib/types'

interface HighlightPanelProps {
  highlights: Highlight[]
}

export default function HighlightPanel({ highlights }: HighlightPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors"
      >
        <span>📖 ハイライト一覧（{highlights.length}件）</span>
        <span className="text-amber-500 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          ▼
        </span>
      </button>
      {isOpen && (
        <ul className="px-4 pb-4 space-y-2 max-h-60 overflow-y-auto">
          {highlights.map((h, i) => (
            <li key={i} className="text-xs text-amber-900 border-l-2 border-amber-300 pl-3 leading-relaxed">
              {h.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
