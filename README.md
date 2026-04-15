# Kindle Learn

KindleのハイライトをObsidianで管理し、AIとのソクラテス式対話を通じて読書内容を深く学ぶWebアプリです。

## 機能

- **Obsidian → Notion 同期**: `.md` ファイルのハイライト（`>` で始まる行）をNotionに自動同期
- **本の選択画面**: Notionに保存された本の一覧をカード形式で表示
- **AIセッション**: Anthropic Claude によるソクラテス式対話で読書理解を深める
- **学びメモ生成**: 「まとめて」と送信すると対話から学びメモを自動生成
- **Notionへ保存**: 生成した学びメモをワンクリックでNotionに保存

---

## セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/tsumu2829/kindle-learn.git
cd kindle-learn
npm install
```

### 2. .env.local の設定

```bash
cp .env.local.example .env.local
```

`.env.local` を編集して以下の値を設定します:

```
ANTHROPIC_API_KEY=sk-ant-...          # Anthropic APIキー
OBSIDIAN_VAULT_PATH=/path/to/vault    # Obsidian kindleフォルダのパス
NOTION_API_KEY=ntn_...                # Notion インテグレーションキー
NOTION_DATABASE_ID=xxxxxxxx           # NotionデータベースID
```

### 3. Notionデータベースの準備

Notionに以下のスキーマのデータベースを作成してください:

| プロパティ名 | 型 |
|------------|-----|
| タイトル | タイトル（title） |
| 同期日 | 日付（date） |
| ハイライト数 | 数値（number） |

次に、Notion インテグレーションをデータベースに接続してください:
1. [Notion Integrations](https://www.notion.so/my-integrations) でインテグレーションを作成
2. データベースページを開き「接続を追加」からインテグレーションを選択

### 4. 初回同期の実行

Obsidianの kindle フォルダ内の `.md` ファイルを Notion に同期します:

```bash
npm run sync
```

同期済みのタイトルはスキップされるため、差分のみ同期されます。

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

---

## Obsidian .md ファイルのフォーマット

ハイライトは `>` で始まる行として認識されます:

```markdown
---
title: 本のタイトル
---

# チャプター1

> これがハイライトとして同期されます

通常のテキストは同期されません。

> 複数のハイライトも同期されます
```

---

## スクリプト一覧

```bash
npm run dev      # 開発サーバー起動
npm run build    # プロダクションビルド
npm run sync     # Obsidian → Notion 同期
```

---

## 技術スタック

- [Next.js 16](https://nextjs.org/) (App Router)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Anthropic Claude](https://www.anthropic.com/) (`claude-sonnet-4-20250514`)
- [@notionhq/client](https://github.com/makenotion/notion-sdk-js)
