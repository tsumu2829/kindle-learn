import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { messages, highlights, bookTitle } = await request.json()

    const highlightText = highlights
      .map((h: { text: string }) => `- ${h.text}`)
      .join('\n')

    const systemPrompt = `あなたはこの本のハイライトを熟知したメンターです。
以下のハイライトを根拠に、ユーザーの思考を深める質問をしてください。

ルール:
- ユーザーに答えを与えず、質問で思考を引き出す
- 1回のターンで投げる質問は1つだけ
- 「まとめて」を受け取ったら学びメモを生成する

学びメモのフォーマット（「まとめて」受信時のみ使用）:
## 📚 ${bookTitle} 読書メモ
### 主なキー学習
- （対話から抽出した学び 3〜5点）
### 今日の気づき
- （ユーザーの回答から見えた新しい視点）
### Next Action
- （この本の内容を活かして実際にやること）

## ハイライト一覧
${highlightText}`

    // messagesが空のときは初回挨拶として最初の質問を促す
    const actualMessages =
      messages.length === 0
        ? [{ role: 'user' as const, content: 'セッションを開始してください。最初の質問をしてください。' }]
        : messages

    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages: actualMessages,
    })

    const encoder = new TextEncoder()

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text))
            }
          }
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('チャットAPIエラー:', error)
    return Response.json(
      { success: false, error: 'AIとの通信に失敗しました' },
      { status: 500 }
    )
  }
}
