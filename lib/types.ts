export interface Book {
  pageId: string
  title: string
  highlightCount: number
  syncedAt: string | null
}

export interface Highlight {
  text: string
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
}
