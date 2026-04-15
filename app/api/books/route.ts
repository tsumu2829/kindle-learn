import { NextResponse } from 'next/server'
import { fetchBooks } from '@/lib/notion'

export async function GET() {
  try {
    const books = await fetchBooks()
    return NextResponse.json({ success: true, data: books })
  } catch (error) {
    console.error('本の一覧取得に失敗:', error)
    return NextResponse.json(
      { success: false, error: '本の一覧を取得できませんでした' },
      { status: 500 }
    )
  }
}
