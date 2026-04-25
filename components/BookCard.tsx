'use client'

import { useRouter } from 'next/navigation'
import type { Book } from '@/lib/types'

interface BookCardProps {
  book: Book
}

export default function BookCard({ book }: BookCardProps) {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push(`/session/${book.pageId}`)}
      className="w-full text-left p-5 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-200 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors line-clamp-2">
            {book.title}
          </h2>

          {/* ジャンルタグ */}
          {book.genres?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {book.genres.slice(0, 3).map((g) => (
                <span
                  key={g}
                  className="px-2 py-0.5 text-xs bg-indigo-50 text-indigo-500 rounded-md"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          <p className="mt-1.5 text-xs text-gray-400">
            {book.lastReadAt
              ? `📖 ${new Date(book.lastReadAt).toLocaleDateString('ja-JP')}`
              : book.syncedAt
                ? `同期: ${new Date(book.syncedAt).toLocaleDateString('ja-JP')}`
                : ''}
          </p>
        </div>

        <div className="flex-shrink-0 flex flex-col items-center bg-indigo-50 rounded-lg px-3 py-2">
          <span className="text-lg font-bold text-indigo-600">{book.highlightCount}</span>
          <span className="text-xs text-indigo-400">ハイライト</span>
        </div>
      </div>
    </button>
  )
}
