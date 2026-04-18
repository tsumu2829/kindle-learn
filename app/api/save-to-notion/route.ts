import { NextResponse } from 'next/server'
import { appendLearningNote, updateLastReadDate } from '@/lib/notion'

export async function POST(request: Request) {
  try {
    const { pageId, content } = await request.json()

    if (!pageId || !content) {
      return NextResponse.json(
        { success: false, error: 'pageId と content は必須です' },
        { status: 400 }
      )
    }

    await appendLearningNote(pageId, content)
    await updateLastReadDate(pageId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notion保存エラー:', error)
    return NextResponse.json(
      { success: false, error: 'Notionへの保存に失敗しました' },
      { status: 500 }
    )
  }
}
