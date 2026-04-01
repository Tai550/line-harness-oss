# LINE Harness - 進捗管理

## プロジェクト概要
LINE公式アカウント向けOSS CRM / マーケティングオートメーション
L-step/Utage代替。AI（CC）ネイティブ設計。

## デプロイ先
- **API**: https://line-crm-worker.yodataichi1249048.workers.dev
- **管理画面**: https://line-harness-three.vercel.app
- **D1**: line-crm (d5c0f42d-bec2-411a-b53d-c08af51d33d6)
- **Cron**: 5分毎ステップ配信チェック + リマインダー配信

## 実装状況

### Round 1 (MVP) ✅ 完了 2026-03-21
- [x] pnpm monorepo
- [x] D1スキーマ（friends, tags, scenarios, steps, broadcasts, auto_replies, messages_log）
- [x] Workers API (Hono) - webhook, friends, tags, scenarios, broadcasts
- [x] LINE SDK型付きラッパー
- [x] ステップ配信Cron
- [x] Next.js管理画面（ダッシュボード、友だち、シナリオ、配信）
- [x] 5分デプロイガイドREADME

### Round 2 (拡張) ✅ 完了 2026-03-21
- [x] UUID Cross-Account System (users, line_accounts テーブル)
- [x] LIFF Auth Flow (apps/liff/ Vite app)
- [x] Affiliate & CV Tracking (affiliates, conversion_points, conversion_events)
- [x] Stealth delivery (ジッター、パーソナライズ、時間分散)
- [x] Rich Message builders (Flex, Carousel, ImageMap, QuickReply)
- [x] SDK npm publish prep
- [x] Enhanced Admin UI (Users, Conversions, Affiliates, LINE Accounts)

### Round 3 (フル機能) ✅ 完了 2026-03-22
- [x] Webhook IN/OUT System — 受信/送信Webhook CRUD + イベント連携
- [x] Google Calendar Integration — GCal接続/予約管理テーブル
- [x] Reminder/Countdown Delivery — リマインダー作成/ステップ/友だち登録/配信Cron
- [x] Lead Scoring — スコアリングルールCRUD + 手動/自動スコア加算 + 履歴
- [x] Template Management — テンプレートCRUD (text/flex/image)
- [x] Operator/Multi-user Chat — チャット閲覧/送信API
- [x] Notification System — 通知ルールCRUD + イベント連動
- [x] Stripe Payment Integration — Stripe連携テーブル/ルート
- [x] BAN Detection & Recovery — アカウントヘルスモニタリング
- [x] IF-THEN Action Automation — オートメーションCRUD + 条件/アクション定義

### Round 3.5 (追加機能) ✅ 完了 2026-03-22
- [x] フォーム (LIFF) — フォーム定義/回答保存/metadata連携/タグ・シナリオ自動付与
- [x] トラッキングリンク — URL計測/クリック記録/タグ自動付与
- [x] リッチメニュー — LINE API経由 作成/画像アップロード/デフォルト設定/個別紐付け
- [x] エントリールート — 流入元トラッキング
- [x] friends.scoreカラム追加

### Round 4 (運用強化) ✅ 完了 2026-04-01
- [x] Vercel + Cloudflare Workers 本番デプロイ
- [x] マルチアカウント Webhook — DB内全アカウントの署名検証 + アクセストークン自動選択
- [x] 友だち自動登録 — message受信時にfriend未登録なら自動でProfile取得 → upsert
- [x] メッセージ分析ページ — LINE Insight API + messages_log 日別集計
- [x] アカウント別友だちフィルタリング — friends.account_id カラム + UIドロップダウン
- [x] アカウント追加エラーハンドリング — ローディング状態 + エラー表示
- [x] Vercel デプロイ修正 — .vercelignore, cleanUrls, outputFileTracingRoot
- [x] Webhook 詳細ログ — waitUntil()内の各ステップログ出力

### Round 5 (予定)
- [ ] メール配信連携 (SendGrid/SES)
- [ ] SMS連携
- [ ] Instagram DM連携
- [ ] LTV予測・チャーン予測
- [ ] ポイントシステム
- [ ] 抽選/くじ機能
- [ ] ファネルビルダー（LIFF + CF Pages）
- [ ] CSV インポート/エクスポート

## 登録済みアカウント (2026-04-01)

| ID | 名前 | チャネルID |
|----|------|-----------|
| 1 | Trainer | 2009442487 |
| 2 | yoda | 2007948600 |

## 技術スタック
| レイヤー | 技術 |
|---------|------|
| API/Webhook | Cloudflare Workers + Hono |
| DB | Cloudflare D1 (SQLite) |
| Cron | Workers Cron Triggers |
| 管理画面 | Next.js 15 + Tailwind on Vercel |
| LIFF | Vite + vanilla TS |
| LINE連携 | 自作型付きSDK (@line-crm/line-sdk) |

## 設計思想
- コア = LINE配信エンジン + UUID基盤 + CV計測
- 外部連携 = Webhook/APIで繋ぐ（Stripe, GCal, SendGrid等）
- ダッシュボード = 視覚的に見るべきものだけ
- 設定・構築 = CC（Claude Code）経由でAPI操作
- マルチアカウント = 1つのWorkerで複数LINE公式アカウントを処理

## 参考資料
- SPEC.md — 技術仕様
- SETUP.md — セットアップ手順
- LSTEP_FEATURES.md — L-step/Utage全機能調査
