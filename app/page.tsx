'use client'

import { useEffect, useMemo, useState } from 'react'
import BookCard from '@/components/BookCard'
import type { Book } from '@/lib/types'

type SortKey = 'lastRead' | 'title' | 'highlights'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'lastRead',   label: '最終読書日' },
  { key: 'title',      label: '50音順' },
  { key: 'highlights', label: 'ハイライト数' },
]

function sortBooks(books: Book[], key: SortKey): Book[] {
  return [...books].sort((a, b) => {
    if (key === 'lastRead') {
      if (!a.lastReadAt && !b.lastReadAt) return 0
      if (!a.lastReadAt) return 1
      if (!b.lastReadAt) return -1
      return b.lastReadAt.localeCompare(a.lastReadAt)
    }
    if (key === 'title') return a.title.localeCompare(b.title, 'ja')
    if (key === 'highlights') return b.highlightCount - a.highlightCount
    return 0
  })
}

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('lastRead')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/books')
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error)
        setBooks(d.data)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const genres = useMemo(() => {
    const set = new Set<string>()
    books.forEach((b) => b.genres?.forEach((g) => set.add(g)))
    return Array.from(set).sort()
  }, [books])

  const filteredBooks = useMemo(() => {
    let result = books
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter((b) => b.title.toLowerCase().includes(q))
    }
    if (selectedGenre) {
      result = result.filter((b) => b.genres?.includes(selectedGenre))
    }
    return sortBooks(result, sortKey)
  }, [books, searchQuery, selectedGenre, sortKey])

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* ヘッダー */}
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">📚 Kindle Learn</h1>
          <p className="mt-1 text-sm text-gray-500">本を選んでAIと対話しながら読書内容を深く学ぼう</p>
        </header>

        {/* 検索バー */}
        <div className="mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="タイトルで検索..."
            className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
          />
        </div>

        {/* ジャンルフィルター */}
        {genres.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
            <button
              onClick={() => setSelectedGenre(null)}
              className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                selectedGenre === null
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'
              }`}
            >
              すべて
            </button>
            {genres.map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGenre(selectedGenre === g ? null : g)}
                className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                  selectedGenre === g
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        )}

        {/* ソートボタン */}
        <div className="flex gap-2 mb-4">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortKey(opt.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                sortKey === opt.key
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* 件数 */}
        <p className="text-xs text-gray-400 mb-3">{filteredBooks.length}冊</p>

        {/* ローディング */}
        {loading && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3 animate-bounce">📚</p>
            <p className="text-sm">読み込み中...</p>
          </div>
        )}

        {/* エラー */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* 空状態 */}
        {!loading && !error && filteredBooks.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-sm">見つかりませんでした</p>
            <p className="text-xs mt-1">検索ワードやジャンルを変えてみてください</p>
          </div>
        )}

        {/* 本一覧 */}
        {!loading && (
          <div className="space-y-3">
            {filteredBooks.map((book) => (
              <BookCard key={book.pageId} book={book} />
            ))}
          </div>
        )}

      </div>
    </main>
  )
}
