export const dynamic = 'force-dynamic'

import BookCard from '@/components/BookCard'
import { fetchBooks } from '@/lib/notion'
import type { Book } from '@/lib/types'

async function getBooks(): Promise<Book[]> {
  try {
    return await fetchBooks()
  } catch (error) {
    console.error('本の一覧取得エラー:', error)
    return []
  }
}

export default async function HomePage() {
  const books = await getBooks()

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">📚 Kindle Learn</h1>
          <p className="mt-1 text-sm text-gray-500">
            本を選んでAIと対話しながら読書内容を深く学ぼう
          </p>
        </header>

        {books.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📖</p>
            <p className="text-sm">本がまだありません</p>
            <p className="text-xs mt-1">npm run sync で Obsidian から同期してください</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-4">{books.length}冊</p>
            <div className="space-y-3">
              {books.map((book) => (
                <BookCard key={book.pageId} book={book} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
