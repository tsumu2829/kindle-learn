import { NextResponse } from 'next/server'
import { fetchHighlights } from '@/lib/notion'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const { pageId } = await params
    const highlights = await fetchHighlights(pageId)
    return NextResponse.json({ success: true, data: highlights })
  } catch (error) {
    console.error('ハイライト取得に失敗:', error)
    return NextResponse.json(
      { success: false, error: 'ハイライトを取得できませんでした' },
      { status: 500 }
    )
  }
}
