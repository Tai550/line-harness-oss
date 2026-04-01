# LINE Harness - 技術仕様書

## Overview
LINE公式アカウント向けOSS CRM / マーケティングオートメーションツール。
API-First設計。Claude Code / AIエージェントからの完全操作を前提とする。

## Tech Stack
- **Frontend**: Next.js 15 (App Router, static export) on Vercel
- **API/Webhook**: Cloudflare Workers (Hono framework)
- **Database**: Cloudflare D1 (SQLite)
- **Cron**: Workers Cron Triggers (5分毎: ステップ配信 + リマインダー)
- **LINE SDK**: 自作型付きラッパー (@line-crm/line-sdk)

## Architecture
```
LINE Platform → CF Workers (webhook) → D1
                  ↑ Multi-account署名検証    ↓
Vercel (Admin UI) → CF Workers (API) → D1
                                      ↓
CF Cron Trigger → Workers → LINE Messaging API
```

## Monorepo Structure
```
line-harness/
├── apps/
│   ├── web/          # Next.js admin dashboard (Vercel)
│   ├── worker/       # Cloudflare Workers API + webhook
│   └── liff/         # LIFF SPA (Vite + TypeScript)
├── packages/
│   ├── db/           # D1 schema, queries
│   ├── line-sdk/     # LINE Messaging API wrapper (typed)
│   └── shared/       # Shared types
├── vercel.json       # Vercel deployment config
├── .vercelignore     # Exclude worker/liff from Vercel
└── package.json      # pnpm workspace
```

## Core Features

### 1. マルチアカウント Webhook
- POST /webhook で全アカウントの channel_secret を DB から取得
- 順番に署名検証し、マッチしたアカウントの access_token を使用
- フォールバック: 環境変数の LINE_CHANNEL_SECRET/LINE_CHANNEL_ACCESS_TOKEN
- account_id を friends テーブルに記録 → アカウント別フィルタリング

### 2. 友だち自動登録
- follow イベント: LINE Profile API → friends テーブル upsert
- message イベント: friend 未登録の場合は自動で Profile API → upsert → メッセージ記録
- 既存公式アカウントの友だちもメッセージ送信時に自動登録される

### 3. Friend Management
- Auto-register on follow/message webhook
- Profile sync (display name, picture)
- Tag system (manual + auto-tagging)
- Account-based filtering (friends.account_id)
- Segment builder (tag combinations)

### 4. Step Delivery (ステップ配信)
- Scenario CRUD with multiple steps
- Delay: minutes, hours, days
- Trigger: friend_add, tag_added, manual
- Support: text, image, flex message
- Stealth delivery: jitter, personalization, time distribution

### 5. Broadcast (一斉配信)
- Send to all or filtered segments
- Schedule future sends
- Draft management

### 6. Message Analytics (メッセージ分析)
- LINE Insight API: delivery stats per day
- Local messages_log: inbound/outbound per day by message type
- Date range picker (max 14 days)
- Summary cards: 送信数(LINE Insight) / 送信数(ローカル) / 受信数
- Daily bar chart + message type breakdown
- CSV export

### 7. Auto Response
- Keyword matching (exact, contains)
- Response: text, flex, image
- Priority ordering

### 8. Rich Menu Management
- Create/switch rich menus via LINE API
- Image upload support
- Default/per-user assignment

### 9. Forms & Surveys (LIFF)
- Form definition CRUD
- Response collection → auto-tag
- Response → trigger scenario

### 10. Reminder Delivery
- Date-based countdown reminders
- Multiple steps per reminder
- Friend enrollment

### 11. Scoring
- Action-based lead scoring rules
- Automatic + manual score delta
- Score history per friend

### 12. IF-THEN Automation
- Trigger: message_received, friend_add, form_submitted, tag_change
- Conditions: JSON-based matching
- Actions: send_message, add_tag, enroll_scenario, etc.

### 13. Notifications
- Rule-based notification triggers
- Multi-channel: in-app, webhook

### 14. Affiliate & Conversion Tracking
- Unique tracking URLs per affiliate
- Click tracking → friend attribution
- Conversion point CRUD
- Revenue reporting

### 15. Multi-Account Support
- Multiple LINE Official Accounts in one dashboard
- Per-account friend filtering
- Account switching in admin UI
- Webhook auto-routing by signature

## D1 Schema (Key Tables)

### Core
- `friends` — LINE user profiles + metadata + account_id
- `tags` — tag definitions
- `friend_tags` — many-to-many
- `line_accounts` — LINE channel configs (secret, token, name)

### Delivery
- `scenarios` — step delivery scenarios
- `scenario_steps` — individual steps
- `friend_scenarios` — user progress
- `broadcasts` — scheduled/sent broadcasts
- `messages_log` — delivery log (inbound/outbound)
- `auto_replies` — keyword → response mapping
- `templates` — reusable message templates

### Engagement
- `reminders` / `reminder_steps` / `friend_reminders` — countdown delivery
- `scoring_rules` / `friend_scores` — lead scoring
- `automations` / `automation_logs` — IF-THEN rules
- `chats` / `operators` — live chat support

### Tracking
- `tracked_links` / `link_clicks` — URL click tracking
- `forms` / `form_submissions` — LIFF forms
- `conversion_points` / `conversion_events` — CV tracking
- `affiliates` / `affiliate_clicks` — affiliate system
- `entry_routes` / `ref_tracking` — 流入元トラッキング

### Infrastructure
- `users` / `user_line_links` — UUID cross-account linking
- `notification_rules` / `notifications` — notification system
- `webhooks_incoming` / `webhooks_outgoing` — external webhooks
- `google_calendar_connections` / `calendar_bookings` — GCal integration
- `account_health_logs` / `account_migrations` — BAN detection & recovery
- `admin_users` — dashboard login
- `stripe_events` — payment integration

## Auth
- Admin dashboard: API key (localStorage)
- Workers API: `Authorization: Bearer <API_KEY>` header
- Webhook: LINE signature verification (HMAC-SHA256)

## Deployment
- **Worker**: `npx wrangler deploy` (apps/worker)
- **Web**: `npx vercel --prod` (static export to Vercel)
  - `vercel.json`: cleanUrls, trailingSlash: false
  - `.vercelignore`: apps/worker, apps/liff excluded
  - `next.config.ts`: outputFileTracingRoot for monorepo
- **LIFF**: Vite build → static hosting

## Stealth Operation
- Rate limiting with jitter/randomization
- Stagger delivery times (±random minutes)
- Standard LINE SDK headers
- Graceful degradation on 429s
- Multi-account: separate channel_secret per account
