export async function GET() {
  return Response.json({
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    hasNotionKey: !!process.env.NOTION_API_KEY,
    hasNotionDb: !!process.env.NOTION_DATABASE_ID,
    notionDbPrefix: process.env.NOTION_DATABASE_ID?.slice(0, 8),
  })
}
