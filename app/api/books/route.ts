import { NextResponse } from 'next/server'
import { fetchBooks } from '@/lib/notion'

export async function GET() {
  try {
    const books = await fetchBooks()
    return NextResponse.json({ success: true, data: books })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('本の一覧取得に失敗:', msg)
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    )
  }
}
