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
        className={`max-w-[85%] md:max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-sm'
            : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-sm'
        }`}
      >
        {message.content}
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
