'use client'

import ReactMarkdown from 'react-markdown'
import type { Message } from '@/lib/types'

interface ChatMessageProps {
  message: Message
  isStreaming?: boolean
}

export default function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm flex-shrink-0 mr-2 mt-1">
          🤖
        </div>
      )}
      <div
        className={`max-w-[85%] md:max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-sm'
            : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-sm'
        }`}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : (
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-headings:text-base prose-h1:text-base prose-h2:text-sm prose-h3:text-sm prose-ul:my-1 prose-li:my-0.5 prose-hr:my-2 prose-strong:font-semibold">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
        {isStreaming && (
          <span className="inline-block w-1 h-4 bg-current animate-pulse ml-1 align-middle" />
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm flex-shrink-0 ml-2 mt-1 text-white">
          👤
        </div>
      )}
    </div>
  )
}
