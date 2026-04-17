import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import { Client } from '@notionhq/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const notion = new Client({ auth: process.env.NOTION_API_KEY })
const DATABASE_ID = process.env.NOTION_DATABASE_ID!
const VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH!

const PYTHON = '/usr/bin/python3'
const EXTRACTOR = path.resolve(__dirname, 'extract-pdf-highlights.py')

interface PdfResult {
  title: string
  highlights: string[]
  error?: string
}

function extractFromPdf(filePath: string): PdfResult {
  try {
    const output = execSync(`"${PYTHON}" "${EXTRACTOR}" "${filePath}"`, {
      encoding: 'utf-8',
      timeout: 30000,
    })
    return JSON.parse(output) as PdfResult
  } catch (error) {
    return { title: '', highlights: [], error: String(error) }
  }
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
      const titleProp =
        page.properties['タイトル'] ??
        page.properties['Name'] ??
        page.properties['title']
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

  const pdfFiles = fs.readdirSync(VAULT_PATH).filter((f) => f.endsWith('.pdf'))
  console.log(`${pdfFiles.length}件のPDFファイルを検出しました`)

  if (pdfFiles.length === 0) {
    console.log('同期するPDFがありません。')
    return
  }

  const existingTitles = await getExistingTitles()
  console.log(`Notionに既存のタイトル: ${existingTitles.size}件`)

  let syncedCount = 0
  let skippedCount = 0

  for (const file of pdfFiles) {
    const filePath = path.join(VAULT_PATH, file)
    const result = extractFromPdf(filePath)

    if (result.error || !result.title) {
      console.error(`スキップ（解析エラー）: ${file} — ${result.error ?? ''}`)
      continue
    }

    const { title, highlights } = result

    if (existingTitles.has(title)) {
      console.log(`スキップ（既存）: ${title}`)
      skippedCount++
      continue
    }

    console.log(`同期中: ${title}（ハイライト ${highlights.length}件）`)

    try {
      const pageId = await createNotionPage(title, highlights)
      if (highlights.length > 0) {
        await addHighlightsToPage(pageId, highlights)
      }
      syncedCount++
      console.log(`  ✓ 完了: ${title}`)
    } catch (error) {
      console.error(`  エラー（${title}）:`, error)
    }
  }

  console.log(`\n同期完了: 新規 ${syncedCount}件 / スキップ ${skippedCount}件`)
}

main().catch((error) => {
  console.error('同期に失敗しました:', error)
  process.exit(1)
})
