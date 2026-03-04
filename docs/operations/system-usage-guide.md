# System Usage Guide

## 1. 概要
- 本システムは jGrants API を扱う Electron デスクトップアプリです。
- 対象OSは macOS / Windows です。
- 主要機能は「検索」「詳細」「お気に入り」「CSV出力」「トークン管理」です。

## 2. できること
1. 補助金の検索
   - キーワード、地域条件で検索できます（地域は候補サジェストから選択）。
2. 補助金の詳細確認
   - 一覧から選択して詳細情報を表示します。
3. お気に入り管理
   - 保存、一覧表示、削除ができます。
4. CSV比較出力
   - 選択した補助金をCSVとして出力します。
5. APIトークン管理
   - トークン保存、読込、削除ができます。

## 3. 運用上の特徴
1. APIフォールバック
   - v2 APIを優先し、対象ステータス時のみv1へフォールバックします。
2. スキーマ検証
   - APIレスポンスは zod で検証し、不正な形を検知します。
3. 機微情報マスキング
   - token, authorization, password 等をログ出力時にマスクします。
4. 相関ID追跡
   - `requestId` を renderer -> preload -> IPC -> APIクライアントで伝播し、追跡可能です。

## 4. ローカル起動
1. `cd "/Users/edamoto/Documents/jgrants-desktop"`
2. `npm install`
3. `npm run dev`

## 5. 品質確認
1. `npm run ci:verify`
2. 必要に応じて `npm run e2e`

## 6. 配布物の作成
1. `npm run dist`
2. 出力先は `dist/` を確認

## 7. ログKPI確認
1. 集計のみ
   - `npm run logs:kpi -- /path/to/app.log`
2. しきい値チェック
   - `npm run logs:kpi:check -- /path/to/app.log`
3. しきい値上書き
   - `npm run logs:kpi:check -- --max-failure-rate=0.02 --max-fallback-rate=0.08 --max-search-p95-ms=3000 --max-detail-p95-ms=2000 /path/to/app.log`

## 8. CIでの動き
1. `verify` ジョブで typecheck/test/build を実行します。
2. macOSではE2E実行ログからKPIレポートを生成し、しきい値チェックを実行します。
3. `e2e-app.log` と `e2e-kpi-report.txt` はartifactとして保存されます。

## 9. リリース時の注意点
1. タグは `vX.Y.Z` 形式を使用します。
2. タグ名と `package.json` の `version` を一致させる必要があります。
3. 署名が必要なリリースは `release-signing.md` のSecretsを事前設定します。
