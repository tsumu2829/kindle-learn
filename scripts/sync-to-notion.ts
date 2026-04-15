import * as fs from 'fs'
import * as path from 'path'
import { Client } from '@notionhq/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const notion = new Client({ auth: process.env.NOTION_API_KEY })
const DATABASE_ID = process.env.NOTION_DATABASE_ID!
const VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH!

function extractHighlights(content: string): string[] {
  const lines = content.split('\n')
  let inFrontmatter = false
  let frontmatterDone = false
  const highlights: string[] = []

  for (const line of lines) {
    if (!frontmatterDone && line.trim() === '---') {
      if (!inFrontmatter) {
        inFrontmatter = true
      } else {
        inFrontmatter = false
        frontmatterDone = true
      }
      continue
    }
    if (inFrontmatter) continue

    if (line.startsWith('>')) {
      const text = line.replace(/^>\s*/, '').trim()
      if (text.length > 0) {
        highlights.push(text)
      }
    }
  }

  return highlights
}

async function getExistingTitles(): Promise<Set<string>> {
  const titles = new Set<string>()
  let cursor: string | undefined = undefined

  do {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      start_cursor: cursor,
    })

    for (const page of response.results) {
      if (page.object !== 'page' || !('properties' in page)) continue
      const titleProp = page.properties['タイトル'] ?? page.properties['Name'] ?? page.properties['title']
      if (titleProp?.type === 'title' && titleProp.title[0]?.plain_text) {
        titles.add(titleProp.title[0].plain_text)
      }
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined
  } while (cursor)

  return titles
}

async function createNotionPage(title: string, highlights: string[]): Promise<string> {
  const page = await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: {
      タイトル: {
        title: [{ text: { content: title } }],
      },
      同期日: {
        date: { start: new Date().toISOString().split('T')[0] },
      },
      ハイライト数: {
        number: highlights.length,
      },
    },
  })
  return page.id
}

async function addHighlightsToPage(pageId: string, highlights: string[]): Promise<void> {
  const BATCH_SIZE = 100

  for (let i = 0; i < highlights.length; i += BATCH_SIZE) {
    const batch = highlights.slice(i, i + BATCH_SIZE)
    await notion.blocks.children.append({
      block_id: pageId,
      children: batch.map((text) => ({
        object: 'block' as const,
        type: 'bulleted_list_item' as const,
        bulleted_list_item: {
          rich_text: [{ type: 'text' as const, text: { content: text } }],
        },
      })),
    })
  }
}

async function main(): Promise<void> {
  console.log('Obsidian → Notion 同期を開始します...')
  console.log(`ボールトパス: ${VAULT_PATH}`)

  if (!fs.existsSync(VAULT_PATH)) {
    throw new Error(`Obsidianボールトが見つかりません: ${VAULT_PATH}`)
  }

  const files = fs.readdirSync(VAULT_PATH).filter((f) => f.endsWith('.md'))
  console.log(`${files.length}件の.mdファイルを検出しました`)

  const existingTitles = await getExistingTitles()
  console.log(`Notionに既存のタイトル: ${existingTitles.size}件`)

  let syncedCount = 0
  let skippedCount = 0

  for (const file of files) {
    const title = path.basename(file, '.md')

    if (existingTitles.has(title)) {
      console.log(`スキップ（既存）: ${title}`)
      skippedCount++
      continue
    }

    const filePath = path.join(VAULT_PATH, file)
    const content = fs.readFileSync(filePath, 'utf-8')
    const highlights = extractHighlights(content)

    console.log(`同期中: ${title}（ハイライト ${highlights.length}件）`)

    try {
      const pageId = await createNotionPage(title, highlights)
      if (highlights.length > 0) {
        await addHighlightsToPage(pageId, highlights)
      }
      syncedCount++
    } catch (error) {
      console.error(`エラー（${title}）:`, error)
    }
  }

  console.log(`\n同期完了: 新規 ${syncedCount}件 / スキップ ${skippedCount}件`)
}

main().catch((error) => {
  console.error('同期に失敗しました:', error)
  process.exit(1)
})
