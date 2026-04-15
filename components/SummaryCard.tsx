'use client'

import { useState } from 'react'

interface SummaryCardProps {
  content: string
  pageId: string
  onSaved?: () => void
}

export default function SummaryCard({ content, pageId, onSaved }: SummaryCardProps) {
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('コピーに失敗しました')
    }
  }

  const handleSaveToNotion = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/save-to-notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, content }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setSaved(true)
      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Notion保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border-2 border-indigo-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 border-b border-indigo-100">
        <h3 className="text-sm font-semibold text-indigo-800">学びメモ</h3>
        <button
          onClick={handleCopy}
          className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors px-2 py-1 rounded hover:bg-indigo-100"
        >
          {copied ? '✓ コピー済み' : '📋 コピー'}
        </button>
      </div>
      <div className="px-4 py-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
        {content}
      </div>
      <div className="px-4 py-3 border-t border-gray-100">
        {error && (
          <p className="text-xs text-red-500 mb-2">{error}</p>
        )}
        <button
          onClick={handleSaveToNotion}
          disabled={saving || saved}
          className="w-full py-2 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saved ? '✓ Notionに保存済み' : saving ? '保存中...' : '📝 Notionに保存'}
        </button>
      </div>
    </div>
  )
}
