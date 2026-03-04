# Logging & Incident Runbook

## 1. 目的
- 障害解析に必要な情報を残しつつ、機微情報をログに出さない。

## 2. ログ仕様
- 出力形式: JSON 1行
- 共通キー: `timestamp`, `level`, `message`, `meta`
- API呼び出し観測キー:
  - `meta.requestId`: 1リクエスト単位の相関ID（v2->v1フォールバック時も同一値）
  - `meta.durationMs`: 各API呼び出しの所要時間（ミリ秒）
  - `meta.apiVersion`: `v1` or `v2`
  - `meta.operation`: `search` or `detail`（失敗ログ）
- マスキング対象:
  - キー名に `token`, `authorization`, `password`, `secret`, `apiKey` を含む値
  - Bearerトークン形式文字列
  - メールアドレス形式文字列

## 3. 収集手順
1. アプリ実行時の標準出力/標準エラーを収集
2. `level=error` を優先的に抽出
3. `message` と `meta` から失敗API・ステータス・`requestId`・`durationMs` を確認

## 4. 障害時の一次対応
1. `uncaughtException` / `unhandledRejection` の直近ログを確認
2. APIフォールバック発生（`Fallback to v1`）の有無を確認
3. 再現手順を記録し、`tests/` に回帰テストを追加

## 5. 監視KPI（最低ライン）
- `API失敗率`: `error レベルの jgrants request failed 件数 / API総リクエスト件数`
  - 目標: 日次で `1% 未満`
- `フォールバック率`: `Fallback to v1 件数 / v2呼び出し件数`
  - 目標: 日次で `5% 未満`（急増時はAPI仕様変更・障害を疑う）
- `P95遅延`: `jgrants search completed` / `jgrants detail completed` の `durationMs` の95パーセンタイル
  - 目標: 検索 `2500ms 以下`、詳細 `1500ms 以下`

## 6. KPI確認手順
1. 同一期間のログを収集し、`message` と `meta.requestId` で集計する
2. 失敗率・フォールバック率・P95遅延を算出して前週比較する
3. 自動集計スクリプトを使う場合:
   - `npm run logs:kpi -- /path/to/app.log`
   - または `cat /path/to/app.log | npm run logs:kpi`
   - しきい値判定を含める場合: `npm run logs:kpi:check -- /path/to/app.log`
4. しきい値超過時は「API応答変化」「ネットワーク」「リリース差分」の順で切り分ける

## 7. 禁止事項
- 生トークンや生メールアドレスをログへ手動出力しない
- 開発時でも `console.log` へ機微情報を直接出力しない
