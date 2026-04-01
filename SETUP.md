# LINE Harness — セットアップ手順

LINE公式アカウント向けオープンソース CRM / マーケティングオートメーションツール。
Cloudflare Workers + D1 (SQLite) + Next.js 15 で構成されています。

---

## 目次

1. [前提条件](#前提条件)
2. [リポジトリ構成](#リポジトリ構成)
3. [ローカル開発環境のセットアップ](#ローカル開発環境のセットアップ)
4. [Cloudflare D1 データベースのセットアップ](#cloudflare-d1-データベースのセットアップ)
5. [LINE チャネルの設定](#line-チャネルの設定)
6. [Worker のデプロイ](#worker-のデプロイ)
7. [管理ダッシュボード (web) のデプロイ](#管理ダッシュボード-web-のデプロイ)
8. [LIFF アプリのデプロイ](#liff-アプリのデプロイ)
9. [Webhook URL の設定](#webhook-url-の設定)
10. [初回ログインと動作確認](#初回ログインと動作確認)
11. [運用コスト目安](#運用コスト目安)
12. [トラブルシューティング](#トラブルシューティング)

---

## 前提条件

| ツール | バージョン |
|--------|-----------|
| Node.js | 20 以上 |
| pnpm | 9.x |
| Wrangler CLI | 3.x |
| Cloudflare アカウント | Workers + D1 が使えること |
| LINE Developers アカウント | Messaging API チャネル作成済み |

```bash
# pnpm のインストール
npm install -g pnpm@9

# Wrangler のインストール
pnpm add -g wrangler

# Cloudflare にログイン
wrangler login
```

---

## リポジトリ構成

```
line-harness/
├── package.json              # モノレポルート
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .env.example
├── .github/workflows/
│   └── deploy-worker.yml     # GitHub Actions: Workerデプロイ
│
├── packages/
│   ├── shared/               # 共通TypeScript型定義
│   ├── line-sdk/             # LINE Messaging API クライアント
│   └── db/                   # Cloudflare D1 クエリヘルパー
│       └── schema.sql        # 全テーブル定義
│
└── apps/
    ├── worker/               # Cloudflare Workers (Hono フレームワーク)
    │   ├── wrangler.toml
    │   └── src/
    │       ├── index.ts      # エントリーポイント + cronハンドラ
    │       ├── middleware/   # 認証ミドルウェア
    │       ├── routes/       # APIルート (21モジュール)
    │       └── services/     # バックグラウンド処理
    │
    ├── web/                  # Next.js 15 管理ダッシュボード
    │   └── src/
    │       ├── app/          # ページ (17画面)
    │       ├── components/   # UIコンポーネント
    │       └── lib/api.ts    # APIクライアント
    │
    └── liff/                 # LIFF SPA (Vite + TypeScript)
        ├── index.html
        └── src/
            ├── main.ts       # 友だち追加フロー
            ├── booking.ts    # 予約カレンダー
            └── form.ts       # カスタムフォーム
```

---

## ローカル開発環境のセットアップ

### 1. 依存パッケージのインストール

```bash
cd /Users/tai/Desktop/line-harness
pnpm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env` を編集:

```env
LINE_CHANNEL_SECRET=your_channel_secret_here
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token_here
API_KEY=your_random_api_key_here          # 自分で決める任意の文字列
NEXT_PUBLIC_API_URL=http://localhost:8787
```

### 3. ローカル D1 データベースの初期化

```bash
# ローカルDBにスキーマを適用
pnpm db:migrate:local
```

### 4. ローカルサーバーの起動

**Worker (ポート 8787)**:
```bash
# apps/worker/wrangler.toml に LINE のシークレットをローカル用に設定
# または wrangler.toml の [vars] に追加
pnpm dev:worker
```

**管理ダッシュボード (ポート 3001)**:
```bash
pnpm dev:web
```

**LIFF アプリ (ポート 3002)**:
```bash
pnpm --filter liff dev
```

---

## Cloudflare D1 データベースのセットアップ

### 1. D1 データベースの作成

```bash
wrangler d1 create line-crm
```

出力例:
```
✅ Successfully created DB 'line-crm'
[[d1_databases]]
binding = "DB"
database_name = "line-crm"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  ← これをコピー
```

### 2. wrangler.toml に DATABASE_ID を設定

`apps/worker/wrangler.toml` を編集:

```toml
[[d1_databases]]
binding = "DB"
database_name = "line-crm"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  ← ここを変更
```

### 3. スキーマの適用 (本番)

```bash
# 本番DBに適用
pnpm db:migrate

# ローカルDBに適用
pnpm db:migrate:local
```

---

## LINE チャネルの設定

### 1. LINE Developers でチャネル作成

1. [LINE Developers Console](https://developers.line.biz/console/) にアクセス
2. 新しいプロバイダーを作成 (または既存を選択)
3. **Messaging API** チャネルを作成
4. 以下の情報を取得:
   - **チャネルシークレット** (Basic settings タブ)
   - **チャネルアクセストークン (長期)** (Messaging API タブ → Issue)

### 2. Webhook URL の設定 (デプロイ後に設定)

- Messaging API タブ → Webhook settings
- Webhook URL: `https://your-worker.your-subdomain.workers.dev/webhook`
- Webhook の利用: ON
- 検証ボタンで疎通確認

---

## Worker のデプロイ

### 1. シークレットの設定

```bash
cd apps/worker

# LINE チャネルシークレット
wrangler secret put LINE_CHANNEL_SECRET
# → プロンプトが出たら入力

# LINE チャネルアクセストークン
wrangler secret put LINE_CHANNEL_ACCESS_TOKEN

# 管理ダッシュボード用 API キー (任意の文字列)
wrangler secret put API_KEY
# → 例: abc123def456ghi789jkl (英数字32文字程度推奨)
```

### 2. デプロイ

```bash
pnpm deploy:worker
```

デプロイ後に表示される URL をメモ:
```
https://line-crm-worker.your-subdomain.workers.dev
```

### 3. Cron トリガーの確認

`wrangler.toml` で設定済み (5分毎に自動実行):
```toml
[triggers]
crons = ["*/5 * * * *"]
```

Cloudflare Dashboard → Workers & Pages → line-crm-worker → Triggers で確認。

---

## 管理ダッシュボード (web) のデプロイ

### Vercel へのデプロイ (推奨)

```bash
# Vercel CLI のインストール
npm install -g vercel

# デプロイ
cd apps/web
vercel

# 環境変数の設定 (Vercel Dashboard でも可)
vercel env add NEXT_PUBLIC_API_URL
# → https://line-crm-worker.your-subdomain.workers.dev を入力
```

### Cloudflare Pages へのデプロイ

```bash
cd apps/web
pnpm build
# out/ ディレクトリを Cloudflare Pages にアップロード
wrangler pages deploy out --project-name=line-harness-web
```

### ローカルビルドのみ

```bash
pnpm deploy:web
# → apps/web/out/ に静的ファイルが生成される
```

---

## LIFF アプリのデプロイ

### 1. LINE Developers で LIFF アプリ登録

1. LINE Developers Console → チャネル → LIFF タブ
2. 「追加」ボタン → LIFF アプリを作成
3. サイズ: Full / Tall / Compact (用途に合わせて選択)
4. エンドポイント URL: デプロイ後の URL を設定
5. **LIFF ID** をメモ (例: `1234567890-xxxxxxxx`)

### 2. 環境変数の設定

`apps/liff/.env` を作成:

```env
VITE_API_URL=https://your-worker.workers.dev
VITE_LIFF_ID=1234567890-xxxxxxxx
VITE_LINE_ID=@your-line-official-account-id
```

### 3. ビルド & デプロイ

```bash
cd apps/liff
pnpm build
# → dist/ ディレクトリを任意の静的ホスティングにデプロイ
```

**ページルーティング**:
- `/` — 友だち追加フロー
- `/?page=booking&connectionId=1` — 予約カレンダー
- `/?page=form&formId=1` — カスタムフォーム

---

## Webhook URL の設定

1. LINE Developers Console → Messaging API タブ
2. Webhook URL に設定:
   ```
   https://line-crm-worker.your-subdomain.workers.dev/webhook
   ```
3. 「検証」ボタンをクリック → `200 OK` が返ればOK
4. 「Webhookの利用」を ON に切り替え

---

## 初回ログインと動作確認

### 1. 管理ダッシュボードにアクセス

デプロイした web アプリの URL を開く。

### 2. ログイン

- **Worker URL**: `https://your-worker.workers.dev`
- **API キー**: `wrangler secret put API_KEY` で設定した値

### 3. 動作確認チェックリスト

- [ ] ダッシュボードが表示される
- [ ] LINE 公式アカウントを友だち追加 → 友だち管理に表示される
- [ ] シナリオを作成 → ステップを追加 → 友だちに手動配信できる
- [ ] 一斉配信を作成 → 送信できる
- [ ] チャットから個別メッセージを送信できる

---

## 主要 API エンドポイント一覧

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/webhook` | LINE Webhook受信 |
| GET | `/api/friends` | 友だち一覧 |
| GET | `/api/friends/count` | 友だち数 |
| POST | `/api/friends/:id/tags` | タグ付与 |
| GET/POST | `/api/scenarios` | シナリオCRUD |
| POST | `/api/scenarios/:id/enroll/:friendId` | 友だちをシナリオ登録 |
| GET/POST | `/api/broadcasts` | 配信CRUD |
| POST | `/api/broadcasts/:id/send` | 配信実行 |
| GET/POST | `/api/tags` | タグCRUD |
| GET/POST | `/api/automations` | オートメーションCRUD |
| GET/POST | `/api/reminders` | リマインダーCRUD |
| GET/POST | `/api/scoring-rules` | スコアリングCRUD |
| GET/POST | `/api/templates` | テンプレートCRUD |
| GET/POST | `/api/forms` | フォームCRUD |
| POST | `/api/forms/:id/submit` | フォーム送信 (認証不要) |
| GET | `/t/:linkId` | トラッキングリンクリダイレクト |
| GET/POST | `/api/integrations/google-calendar/slots` | 空き時間取得 |
| GET/POST | `/api/integrations/google-calendar/bookings` | 予約管理 |
| POST | `/api/conversions/track` | コンバージョン記録 |
| GET/POST | `/api/line-accounts` | LINEアカウント管理 |
| GET/POST | `/api/webhooks/outgoing` | 外部Webhook設定 |

---

## 運用コスト目安

| 友だち数 | 月額コスト |
|---------|-----------|
| 〜5,000人 | **無料** (Cloudflare Workers Free tier) |
| 〜10,000人 | **約 $5.75/月** (Workers Paid $5 + D1 使用料) |
| 50,000人以上 | Cloudflare Queues 追加を検討 |

**L-step (月額 $20〜) と比較して大幅にコスト削減可能。**

---

## GitHub Actions による自動デプロイ

`.github/workflows/deploy-worker.yml` が含まれています。

### シークレットの設定 (GitHub リポジトリの Settings → Secrets)

| シークレット名 | 取得場所 |
|--------------|---------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare Dashboard → My Profile → API Tokens |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → 右サイドバー |

### 手動デプロイ

GitHub → Actions タブ → "Deploy Worker" → "Run workflow"

---

## トラブルシューティング

### Webhook 検証が失敗する

- Worker が正常にデプロイされているか確認
- `LINE_CHANNEL_SECRET` が正しいか確認
- Webhook URL の末尾に `/webhook` が付いているか確認

### 友だちが登録されない

- Webhook の利用が ON になっているか確認
- Worker のログを確認: `wrangler tail`

### ステップ配信が届かない

- Cron Trigger が有効になっているか Cloudflare Dashboard で確認
- `friend_scenarios` テーブルの `next_delivery_at` が過去の日時になっているか確認
- `LINE_CHANNEL_ACCESS_TOKEN` が有効か確認

### 管理ダッシュボードでログインできない

- Worker URL が `https://` で始まっているか確認 (http は不可)
- API キーが wrangler secret で設定したものと一致しているか確認
- ブラウザのコンソールでエラーを確認

### ローカル開発で D1 が見つからない

```bash
# ローカル D1 をリセットして再作成
rm -rf .wrangler/state/d1
pnpm db:migrate:local
```

---

## スケーリング Tips

### 大量配信 (50,000人以上)

`apps/worker/src/services/stealth.ts` のパラメータを調整:

```typescript
// StealthRateLimiter: デフォルト 1000req/60sec
new StealthRateLimiter(500, 60000)  // より保守的に

// calculateStaggerDelay: バッチ間の遅延を増やす
```

### Cloudflare Queues の追加

大量配信時は Queues を使って配信をキューイングすることを推奨。
`wrangler.toml` に Queue バインディングを追加して `multicast` 呼び出しを非同期化。

---

## ライセンス

MIT License — 商用利用・改変・再配布すべて自由です。
