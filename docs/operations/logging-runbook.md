# Logging & Incident Runbook

## 1. 目的
- 障害解析に必要な情報を残しつつ、機微情報をログに出さない。

## 2. ログ仕様
- 出力形式: JSON 1行
- 共通キー: `timestamp`, `level`, `message`, `meta`
- マスキング対象:
  - キー名に `token`, `authorization`, `password`, `secret`, `apiKey` を含む値
  - Bearerトークン形式文字列
  - メールアドレス形式文字列

## 3. 収集手順
1. アプリ実行時の標準出力/標準エラーを収集
2. `level=error` を優先的に抽出
3. `message` と `meta` から失敗API・ステータス・実行条件を確認

## 4. 障害時の一次対応
1. `uncaughtException` / `unhandledRejection` の直近ログを確認
2. APIフォールバック発生（`Fallback to v1`）の有無を確認
3. 再現手順を記録し、`tests/` に回帰テストを追加

## 5. 禁止事項
- 生トークンや生メールアドレスをログへ手動出力しない
- 開発時でも `console.log` へ機微情報を直接出力しない
