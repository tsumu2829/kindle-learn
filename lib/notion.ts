import { Client } from '@notionhq/client'
import type { Book, Highlight } from './types'

export const notion = new Client({
  auth: process.env.NOTION_API_KEY,
})

const DATABASE_ID = process.env.NOTION_DATABASE_ID!

export async function fetchBooks(): Promise<Book[]> {
  const allPages: any[] = []
  let cursor: string | undefined = undefined

  do {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      sorts: [
        { property: '最終読書日', direction: 'descending' },
        { timestamp: 'created_time', direction: 'descending' },
      ],
      start_cursor: cursor,
      page_size: 100,
    })
    allPages.push(...response.results)
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
  } while (cursor)

  return allPages
    .map((page) => {
      if (page.object !== 'page' || !('properties' in page)) return null
      const props = page.properties

      const titleProp = props['タイトル'] ?? props['Name'] ?? props['title']
      const title =
        titleProp?.type === 'title'
          ? (titleProp.title[0]?.plain_text ?? '')
          : ''

      const countProp = props['ハイライト数']
      const highlightCount =
        countProp?.type === 'number' ? (countProp.number ?? 0) : 0

      const dateProp = props['同期日']
      const syncedAt =
        dateProp?.type === 'date' ? (dateProp.date?.start ?? null) : null

      const lastReadProp = props['最終読書日']
      const lastReadAt =
        lastReadProp?.type === 'date' ? (lastReadProp.date?.start ?? null) : null

      return { pageId: page.id, title, highlightCount, syncedAt, lastReadAt }
    })
    .filter((book): book is NonNullable<typeof book> => book !== null && book.title.length > 0 && book.highlightCount > 0)
}

export async function fetchHighlights(pageId: string): Promise<Highlight[]> {
  const response = await notion.blocks.children.list({ block_id: pageId })

  return response.results
    .filter(
      (block) =>
        block.object === 'block' &&
        'type' in block &&
        block.type === 'bulleted_list_item'
    )
    .map((block) => {
      if (
        block.object === 'block' &&
        'type' in block &&
        block.type === 'bulleted_list_item' &&
        'bulleted_list_item' in block
      ) {
        const text = block.bulleted_list_item.rich_text
          .map((t: { plain_text: string }) => t.plain_text)
          .join('')
        return { text }
      }
      return { text: '' }
    })
    .filter((h) => h.text.length > 0)
}

export async function appendLearningNote(
  pageId: string,
  content: string
): Promise<void> {
  const lines = content.split('\n')

  const blocks = lines.map((line) => ({
    object: 'block' as const,
    type: 'paragraph' as const,
    paragraph: {
      rich_text: [
        {
          type: 'text' as const,
          text: { content: line },
        },
      ],
    },
  }))

  await notion.blocks.children.append({
    block_id: pageId,
    children: blocks,
  })
}

export async function updateLastReadDate(pageId: string): Promise<void> {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      最終読書日: {
        date: { start: new Date().toISOString().split('T')[0] },
      },
    },
  })
}
