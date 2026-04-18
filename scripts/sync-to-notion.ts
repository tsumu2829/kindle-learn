import * as fs from 'fs'
import * as path from 'path'
import { Client } from '@notionhq/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const notion = new Client({ auth: process.env.NOTION_API_KEY })
const DATABASE_ID = process.env.NOTION_DATABASE_ID!
const VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH!
const KINDLE_DIR = path.join(VAULT_PATH, 'kindle', 'kindle')

// タイトルキーワードからジャンルを自動判定
const GENRE_RULES: { keywords: string[]; genre: string }[] = [
  { keywords: ['投資', '株', '資産', 'お金', '金融', '財務', '経済', '節税', '富', '稼ぐ'], genre: '投資・お金' },
  { keywords: ['マネジメント', '部下', 'リーダー', 'チーム', '組織', '上司', 'マネージャー', '人材', '採用'], genre: 'マネジメント' },
  { keywords: ['起業', 'スタートアップ', 'SaaS', '経営', '事業', 'ビジネスモデル', '会社'], genre: '起業・経営' },
  { keywords: ['AI', 'DX', 'IT', 'プログラミング', 'エンジニア', 'セキュリティ', 'AWS', 'クラウド', 'データ', 'ChatGPT', 'デジタル'], genre: 'テクノロジー' },
  { keywords: ['営業', '交渉', 'プレゼン', '提案', 'コミュニケーション', '質問', '説得', '人を動かす'], genre: '営業・コミュニケーション' },
  { keywords: ['習慣', '生産性', '時間', 'タスク', 'ルーティン', '朝', '仕事術', 'アウトプット', '学習', '読書', '思考'], genre: '仕事術・生産性' },
  { keywords: ['マーケティング', 'ブランド', '集客', '広告', 'SNS', 'コンテンツ'], genre: 'マーケティング' },
  { keywords: ['キャリア', '転職', '副業', 'フリーランス', '強み', '自己分析', '戦略'], genre: 'キャリア' },
  { keywords: ['メンタル', '心理', '脳', 'ストレス', '幸福', 'マインド', '感情', '自己肯定'], genre: '心理・メンタル' },
  { keywords: ['健康', '睡眠', '食事', '運動', 'ダイエット', '筋肉'], genre: '健康・ライフスタイル' },
  { keywords: ['歴史', '哲学', '教養', '文化', '地政学', '社会', '宗教'], genre: '教養・人文' },
  { keywords: ['小説', '物語', 'フィクション'], genre: '小説・エンタメ' },
]

function detectGenres(title: string): string[] {
  const genres: string[] = []
  for (const rule of GENRE_RULES) {
    if (rule.keywords.some((kw) => title.includes(kw))) {
      genres.push(rule.genre)
    }
  }
  return genres
}

interface BookData {
  title: string
  author: string
  imageUrl: string
  highlights: string[]
}

function parseMarkdownFile(filePath: string): BookData | null {
  const content = fs.readFileSync(filePath, 'utf-8')

  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!frontmatterMatch) return null

  const frontmatter = frontmatterMatch[1]
  const titleMatch = frontmatter.match(/^\s*title:\s*(.+)$/m)
  const authorMatch = frontmatter.match(/^\s*author:\s*(.+)$/m)
  const imageMatch = frontmatter.match(/^\s*bookImageUrl:\s*['"]?(.+?)['"]?\s*$/m)

  const title = titleMatch?.[1]?.trim().replace(/^['"]|['"]$/g, '')
  const author = authorMatch?.[1]?.trim().replace(/^['"]|['"]$/g, '') ?? ''
  const imageUrl = imageMatch?.[1]?.trim() ?? ''

  if (!title) return null

  const highlightsSection = content.split(/^## Highlights/m)[1]
  if (!highlightsSection) return { title, author, imageUrl, highlights: [] }

  const highlights = highlightsSection
    .split(/\n---\n/)
    .map((block) =>
      block
        .replace(/\s*[—–-]\s*location:[\s\S]*$/, '')
        .replace(/^\s*\n/, '')
        .trim()
    )
    .filter((text) => text.length > 0)

  return { title, author, imageUrl, highlights }
}

async function getExistingBooks(): Promise<Map<string, string>> {
  const books = new Map<string, string>()
  let cursor: string | undefined = undefined

  do {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      start_cursor: cursor,
    })
    for (const page of response.results) {
      if (page.object !== 'page' || !('properties' in page)) continue
      const titleProp =
        page.properties['タイトル'] ?? page.properties['Name'] ?? page.properties['title']
      if (titleProp?.type === 'title' && titleProp.title[0]?.plain_text) {
        books.set(titleProp.title[0].plain_text, page.id)
      }
    }
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
  } while (cursor)

  return books
}

async function createNotionPage(book: BookData): Promise<string> {
  const genres = detectGenres(book.title)

  const page = await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    cover: book.imageUrl
      ? { type: 'external', external: { url: book.imageUrl } }
      : undefined,
    properties: {
      タイトル: { title: [{ text: { content: book.title } }] },
      同期日: { date: { start: new Date().toISOString().split('T')[0] } },
      ハイライト数: { number: book.highlights.length },
      ...(genres.length > 0 && {
        ジャンル: { multi_select: genres.map((g) => ({ name: g })) },
      }),
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
          rich_text: [{ type: 'text' as const, text: { content: text.slice(0, 2000) } }],
        },
      })),
    })
  }
}

// 既存ページに書影とジャンルを追記するマイグレーション
async function updateExistingPages(): Promise<void> {
  console.log('\n既存ページを更新中（書影・ジャンル追加）...')
  const mdFiles = fs.readdirSync(KINDLE_DIR).filter((f) => f.endsWith('.md'))

  // タイトル → BookData のマップを作成
  const bookMap = new Map<string, BookData>()
  for (const file of mdFiles) {
    const book = parseMarkdownFile(path.join(KINDLE_DIR, file))
    if (book?.title) bookMap.set(book.title, book)
  }

  let cursor: string | undefined = undefined
  let updatedCount = 0

  do {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      start_cursor: cursor,
      page_size: 100,
    })

    for (const page of response.results) {
      if (page.object !== 'page' || !('properties' in page)) continue

      const titleProp =
        page.properties['タイトル'] ?? page.properties['Name'] ?? page.properties['title']
      const title = titleProp?.type === 'title' ? titleProp.title[0]?.plain_text : null
      if (!title) continue

      const book = bookMap.get(title)
      if (!book) continue

      // 書影もジャンルもすでに設定済みならスキップ
      const hascover = (page as any).cover?.external?.url
      const genreProp = page.properties['ジャンル']
      const hasGenre =
        genreProp?.type === 'multi_select' && genreProp.multi_select.length > 0

      if (hascover && hasGenre) continue

      const genres = detectGenres(book.title)

      try {
        await notion.pages.update({
          page_id: page.id,
          cover: book.imageUrl && !hascover
            ? { type: 'external', external: { url: book.imageUrl } }
            : undefined,
          properties: {
            ...(!hasGenre && genres.length > 0 && {
              ジャンル: { multi_select: genres.map((g) => ({ name: g })) },
            }),
          },
        })
        updatedCount++
        process.stdout.write(`\r  更新済み: ${updatedCount}件`)
      } catch {
        // 個別エラーは無視して続行
      }
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
  } while (cursor)

  console.log(`\n  既存ページ更新完了: ${updatedCount}件`)
}

async function main(): Promise<void> {
  const isUpdateOnly = process.argv.includes('--update-only')

  if (!isUpdateOnly) {
    console.log('Obsidian Kindle → Notion 同期を開始します...')
    console.log(`Kindleフォルダ: ${KINDLE_DIR}`)

    if (!fs.existsSync(KINDLE_DIR)) {
      throw new Error(`Kindleフォルダが見つかりません: ${KINDLE_DIR}`)
    }

    const mdFiles = fs.readdirSync(KINDLE_DIR).filter((f) => f.endsWith('.md'))
    console.log(`${mdFiles.length}件のMarkdownファイルを検出`)

    const existingBooks = await getExistingBooks()
    console.log(`Notionに既存: ${existingBooks.size}件`)

    let syncedCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (const file of mdFiles) {
      const filePath = path.join(KINDLE_DIR, file)
      const book = parseMarkdownFile(filePath)

      if (!book?.title) { errorCount++; continue }
      if (existingBooks.has(book.title)) { skippedCount++; continue }
      if (book.highlights.length === 0) { skippedCount++; continue }

      console.log(`同期中: ${book.title}（${book.highlights.length}件）`)
      try {
        const pageId = await createNotionPage(book)
        await addHighlightsToPage(pageId, book.highlights)
        syncedCount++
        console.log(`  ✓ ${book.title}`)
      } catch (error) {
        console.error(`  ✗ エラー（${book.title}）:`, error)
        errorCount++
      }
    }

    console.log(`\n同期完了: 新規 ${syncedCount}件 / スキップ ${skippedCount}件 / エラー ${errorCount}件`)
  }

  // 既存ページに書影・ジャンルを追加
  await updateExistingPages()
}

main().catch((error) => {
  console.error('同期に失敗しました:', error)
  process.exit(1)
})
