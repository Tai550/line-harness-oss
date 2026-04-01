# LINE Harness - セキュリティ評価レポート

最終評価日: 2026-04-01

---

## 1. メッセージ誤送信リスク評価

### 結論: 誤送信リスクなし

全送信経路において、宛先は必ず `friend_id → DBルックアップ → line_user_id` で解決される。
`friends.line_user_id` は `UNIQUE` 制約で保護されており、1対1の紐付けが保証されている。

さらに、LINE Messaging API 自体がトークンとユーザーIDの整合性を検証するため、
仮に誤ったトークンで送信しても **403エラーで拒否** される（別アカウントの友達には届かない）。

### 全送信経路の検証結果

| # | 経路 | ファイル | 宛先解決方法 | 誤送信リスク |
|---|------|---------|-------------|-------------|
| 1 | 個別メッセージ送信 | `routes/friends.ts:73-90` | friend_id → DB → line_user_id → push | なし |
| 2 | チャット送信 | `routes/chats.ts:47-58` | chat_id → DB JOIN friends → line_user_id → push | なし |
| 3 | 一斉配信（全員） | `services/broadcast.ts:29` | LINE API broadcast（宛先指定なし、全フォロワーに配信） | なし |
| 4 | タグ絞り込み配信 | `services/broadcast.ts:33-46` | tag_id → friend_tags JOIN → line_user_id一覧 → multicast | なし |
| 5 | セグメント配信 | `services/segment-send.ts:42-79` | 条件SQL → line_user_id一覧 → multicast | なし |
| 6 | ステップ配信（Cron） | `services/step-delivery.ts:24-73` | friend_scenarios → friend_id → DB → line_user_id → push | なし |
| 7 | リマインダー配信（Cron） | `services/reminder-delivery.ts:10-35` | DB JOINで friend_id + line_user_id を同時取得 → push | なし |
| 8 | オートメーション送信 | `services/event-bus.ts:76-81` | data.friendId → DB → line_user_id → push | なし |

### LINE プラットフォームによる防御

LINE Messaging API は、チャネルアクセストークンに紐づくアカウントの友達にのみメッセージを送信できる。
異なるアカウントの友達に送ろうとすると **HTTP 403** で拒否される。
このため、アプリケーション側にバグがあっても「別のお客様にメッセージが届く」事態は発生しない。

### ステップ配信（シナリオ自動配信）の安全性

**経路**: `Cron → friend_scenarios(配信予定) → friend_id → DB照会 → line_user_id → push`

- 宛先は必ず `friend_id` からDBルックアップで `line_user_id` を取得して送信
- 別の友達に届くことはない
- マルチアカウント時の挙動: 環境変数のトークン（単一）を使用するため、異なるアカウントの友達への配信は **LINE APIが403で拒否** する。誤送信ではなく未達になる

### 一斉配信（ブロードキャスト）の安全性

**全員配信** (`target_type: "all"`):
- `lineClient.broadcast()` を使用。LINE API側でそのトークンのアカウントの全フォロワーに配信
- アプリ側で宛先を指定しないため、間違えようがない

**タグ絞り込み配信** (`target_type: "tag"`):
- `tag_id → friend_tags JOIN friends → line_user_id一覧 → multicast`
- 宛先はDB JOINで取得。別人に届くことはない
- マルチアカウント時の挙動: タグが全アカウント共通のため、異なるアカウントの友達もクエリ結果に含まれるが、LINE APIが403で拒否するため **届かないだけで誤送信はしない**。成功件数が実際より少なく見える可能性がある

**セグメント配信**:
- 条件SQLで `line_user_id` 一覧を取得 → multicast
- タグ配信と同様、LINE API側の検証で誤送信は防止される

### 一斉配信・ステップ配信の誤送信リスクまとめ

| 懸念 | 結果 |
|------|------|
| 別のお客様にメッセージが届く | **起きない** |
| ステップ配信で宛先が混ざる | **起きない** |
| 一斉配信で意図しない人に届く | **起きない** |
| 別アカウントの友達に送信失敗する | **起きる（機能不足、セキュリティリスクではない）** |

---

## 2. 認証・認可

### API 認証
- 全APIエンドポイントは `Authorization: Bearer <API_KEY>` ヘッダーを要求
- 認証ミドルウェア: `apps/worker/src/middleware/auth.ts`
- 除外パス: `/webhook`（LINE署名検証で保護）、`/api/forms/:id/submit`（公開フォーム）、`/t/:linkId`（トラッキングリンクリダイレクト）

### Webhook 署名検証
- LINE からの Webhook は HMAC-SHA256 で署名検証
- マルチアカウント: DB内の全アカウントの `channel_secret` で順次検証
- フォールバック: 環境変数の `LINE_CHANNEL_SECRET`
- 検証失敗時は HTTP 400 を返却

---

## 3. 既知の制限事項

### マルチアカウント送信時のトークン固定

**影響**: 送信失敗（セキュリティリスクではない）

送信側の全経路で環境変数 `LINE_CHANNEL_ACCESS_TOKEN`（単一トークン）を使用している。
このため、環境変数に設定されていないアカウント（例: yoda）の友達にダッシュボードからメッセージを送信すると、
LINE APIが403を返し **送信が失敗** する。

該当箇所:
- `routes/friends.ts:78`
- `routes/chats.ts:52`
- `services/broadcast.ts:22`
- `services/step-delivery.ts:15`
- `services/reminder-delivery.ts:8`
- `services/event-bus.ts:79`

**対策**: 友達の `account_id` から DB で正しい `channel_access_token` を取得して使用するよう修正が必要。
これはセキュリティ問題ではなく機能改善。

### 送信失敗のサイレントエラー

ステップ配信・リマインダー配信の失敗は `console.error` のみでユーザーに通知されない。
配信が止まったことに気づけないリスクがある。

---

## 4. データ保護

### 機密情報の管理
- `channel_secret` / `channel_access_token` は DB (`line_accounts` テーブル) に平文保存
- 環境変数にも `wrangler.toml` の `[vars]` で設定（本番は `wrangler secret put` 推奨）
- `.gitignore` で `.env` / `.env.local` を除外
- GitHub への push 時は `wrangler.toml` のシークレットをプレースホルダーに置換済み

### D1 データベース
- Cloudflare D1 は暗号化ストレージ（Cloudflare管理）
- APIキー認証でアクセス制限
- SQLインジェクション: 全クエリでプリペアドステートメント使用

---

## 5. 評価サマリー

| カテゴリ | 評価 | 備考 |
|---------|------|------|
| メッセージ誤送信 | **安全** | DB制約 + LINE API側の検証で二重防御 |
| API認証 | **安全** | Bearer token + webhook署名検証 |
| SQLインジェクション | **安全** | 全クエリ prepared statement |
| シークレット管理 | **注意** | DB内平文保存。暗号化は未実装 |
| エラー通知 | **改善推奨** | 送信失敗のユーザー通知なし |
| マルチアカウント送信 | **機能不足** | 送信失敗するが誤送信はしない |
