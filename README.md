# LINE Harness

LINE公式アカウント向けオープンソースCRM / マーケティングオートメーションツール。
L-step や Utage の代替として、無料（または低コスト）で運用できます。

## 機能

- **友だち管理** — Webhook で自動登録、タグ付け、セグメント分け、アカウント別フィルタリング
- **ステップ配信** — シナリオ作成、遅延配信、友だち追加/タグトリガー
- **一斉配信** — 全員またはタグ絞り込み、予約配信
- **自動応答** — キーワードマッチによる自動返信
- **メッセージ分析** — LINE Insight API + ローカルメッセージログの日別集計
- **マルチアカウント** — 複数LINE公式アカウントを一元管理、Webhook自動振り分け
- **管理画面** — Next.js ダッシュボードで直感的に操作

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| API / Webhook | Cloudflare Workers + Hono |
| データベース | Cloudflare D1 (SQLite) |
| 定期実行 | Workers Cron Triggers (5分毎) |
| 管理画面 | Next.js 15 (App Router) + Tailwind CSS on Vercel |
| LINE連携 | LINE Messaging API (自作型付きSDK) |

## アーキテクチャ

```
LINE Platform → CF Workers (webhook) → D1
                  ↑ マルチアカウント署名検証    ↓
Vercel (Admin UI) → CF Workers (API) → D1
                                      ↓
CF Cron Trigger → Workers → LINE Messaging API
```

### マルチアカウント Webhook

```
LINE Account A → POST /webhook (signature A)
LINE Account B → POST /webhook (signature B)
       ↓
Worker: DB から全アカウントの channel_secret を取得
        → 各 secret で署名検証 → マッチしたアカウントの access_token で応答
        → friends テーブルに account_id を記録
```

## セットアップ

詳細な手順は [SETUP.md](SETUP.md) を参照。

### クイックスタート

```bash
git clone https://github.com/Tai550/line-harness-oss.git
cd line-harness-oss
cp .env.example .env
pnpm install

# D1 データベース作成 & スキーマ適用
npx wrangler d1 create line-crm
npx wrangler d1 execute line-crm --file=packages/db/schema.sql

# Workers デプロイ
cd apps/worker
npx wrangler deploy

# 管理画面デプロイ (Vercel)
npx vercel --prod
```

## プロジェクト構成

```
line-harness/
├── apps/
│   ├── web/              # Next.js 管理画面 (Vercel)
│   │   └── src/app/
│   │       ├── analytics/    # メッセージ分析ページ
│   │       ├── friends/      # 友だち管理（アカウント別フィルタ）
│   │       ├── chats/        # チャット
│   │       └── ...           # 他17画面
│   ├── worker/           # Cloudflare Workers API
│   │   └── src/
│   │       ├── routes/
│   │       │   ├── webhook.ts      # マルチアカウント対応 Webhook
│   │       │   ├── analytics.ts    # メッセージ分析 API
│   │       │   └── ...             # 他18ルート
│   │       └── services/
│   └── liff/             # LIFF SPA (Vite)
├── packages/
│   ├── db/               # D1 スキーマ & クエリ
│   │   ├── schema.sql
│   │   └── src/
│   │       ├── messages-analytics.ts  # メッセージ集計クエリ
│   │       └── ...
│   ├── line-sdk/         # LINE Messaging API ラッパー
│   └── shared/           # 共有型定義
├── .vercelignore
├── vercel.json
└── package.json
```

## API エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/webhook` | LINE Webhook (マルチアカウント対応) |
| GET | `/api/friends?accountId=N` | 友だち一覧 (アカウント別フィルタ) |
| GET | `/api/friends/count` | 友だち数 |
| POST | `/api/friends/:id/tags` | タグ追加 |
| POST | `/api/friends/:id/messages` | 個別メッセージ送信 |
| GET | `/api/analytics/messages?accountId=N&from=YYYY-MM-DD&to=YYYY-MM-DD` | メッセージ分析 |
| GET/POST | `/api/scenarios` | シナリオCRUD |
| GET/POST | `/api/broadcasts` | 配信CRUD |
| POST | `/api/broadcasts/:id/send` | 配信実行 |
| GET/POST | `/api/tags` | タグCRUD |
| GET/POST | `/api/automations` | オートメーションCRUD |
| GET/POST | `/api/reminders` | リマインダーCRUD |
| GET/POST | `/api/scoring-rules` | スコアリングCRUD |
| GET/POST | `/api/templates` | テンプレートCRUD |
| GET/POST | `/api/forms` | フォームCRUD |
| GET/POST | `/api/line-accounts` | LINEアカウント管理 |
| GET/POST | `/api/chats` | チャット管理 |
| GET/POST | `/api/webhooks/outgoing` | 外部Webhook設定 |
| GET/POST | `/api/notification-rules` | 通知ルールCRUD |

## スケーリング

| 友だち数 | コスト目安 |
|----------|-----------|
| ~5,000 | 無料 |
| ~10,000 | D1: $0.75/100万読取, Workers: $5/月 |
| 50,000+ | Queues追加で配信レート制御推奨 |

## ライセンス

MIT
