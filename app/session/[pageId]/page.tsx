'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ChatMessage from '@/components/ChatMessage'
import ChatInput from '@/components/ChatInput'
import HighlightPanel from '@/components/HighlightPanel'
import SummaryCard from '@/components/SummaryCard'
import type { Message, Highlight, Book } from '@/lib/types'

export default function SessionPage() {
  const { pageId } = useParams<{ pageId: string }>()
  const router = useRouter()

  const [book, setBook] = useState<Book | null>(null)
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const bottomRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)

  useEffect(() => {
    async function init() {
      try {
        const [booksRes, hlRes] = await Promise.all([
          fetch('/api/books'),
          fetch(`/api/highlights/${pageId}`),
        ])
        const [booksData, hlData] = await Promise.all([
          booksRes.json(),
          hlRes.json(),
        ])

        if (!booksData.success) throw new Error(booksData.error)
        if (!hlData.success) throw new Error(hlData.error)

        const foundBook = booksData.data.find((b: Book) => b.pageId === pageId) ?? null
        setBook(foundBook)
        setHighlights(hlData.data)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'データの読み込みに失敗しました')
        setLoading(false)
      }
    }
    init()
  }, [pageId])

  useEffect(() => {
    if (!loading && highlights.length > 0 && book && !initialized.current) {
      initialized.current = true
      sendToAI([], highlights, book.title)
    }
  }, [loading, highlights, book])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  async function sendToAI(
    currentMessages: Message[],
    currentHighlights: Highlight[],
    bookTitle: string
  ) {
    setIsStreaming(true)
    setStreamingContent('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages,
          highlights: currentHighlights,
          bookTitle,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error ?? 'AI通信エラー')
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('ストリームを読み取れません')

      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        fullContent += chunk
        setStreamingContent(fullContent)
      }

      const aiMessage: Message = { role: 'assistant', content: fullContent }
      setMessages((prev) => [...prev, aiMessage])
      setStreamingContent('')

      if (fullContent.includes('## 📚')) {
        setSummary(fullContent)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AIとの通信に失敗しました')
    } finally {
      setIsStreaming(false)
    }
  }

  async function handleSend(text: string) {
    if (!book) return
    const userMessage: Message = { role: 'user', content: text }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    await sendToAI(updatedMessages, highlights, book.title)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-3 animate-bounce">📚</div>
          <p className="text-sm">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="戻る"
          >
            ←
          </button>
          <h1 className="flex-1 text-sm font-semibold text-gray-800 line-clamp-1">
            {book?.title ?? 'セッション'}
          </h1>
          <span className="text-xs text-gray-400">{highlights.length}件</span>
        </div>
      </header>

      {/* メインエリア */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 flex flex-col gap-4 overflow-y-auto">
        {/* ハイライトパネル */}
        {highlights.length > 0 && <HighlightPanel highlights={highlights} />}

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* チャット */}
        <div className="flex-1">
          {messages.map((msg, i) => (
            <ChatMessage key={i} message={msg} />
          ))}

          {/* ストリーミング中のAIメッセージ */}
          {isStreaming && streamingContent && (
            <ChatMessage
              message={{ role: 'assistant', content: streamingContent }}
              isStreaming
            />
          )}

          {/* ストリーミング中のローディング（まだ内容がない場合） */}
          {isStreaming && !streamingContent && (
            <div className="flex justify-start mb-4">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm mr-2 mt-1">
                🤖
              </div>
              <div className="px-4 py-3 bg-white rounded-2xl rounded-tl-sm border border-gray-100 shadow-sm">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}

          {/* 学びメモ */}
          {summary && !isStreaming && (
            <div className="mt-4">
              <SummaryCard content={summary} pageId={pageId} />
            </div>
          )}
        </div>

        <div ref={bottomRef} />
      </div>

      {/* 入力エリア */}
      <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <ChatInput
            onSend={handleSend}
            disabled={isStreaming}
            placeholder="返答を入力... (「まとめて」で学びメモ生成)"
          />
        </div>
      </div>
    </div>
  )
}
