# jgrants-desktop

Jグランツ情報を扱う独立デスクトップアプリ開発用リポジトリ。

## 開発方針
- 対象OS: macOS / Windows
- 配布: Electron + electron-builder
- 既存の `foldercopygas` とは完全分離

## コマンド
- `npm install`
- `npm run dev`
- `npm run typecheck`
- `npm run test`
- `npm run e2e`
- `npm run ci:verify`
- `npm run release:preflight`
- `npm run logs:kpi -- /path/to/app.log`
- `npm run logs:kpi:check -- /path/to/app.log`
- `npm run build`
- `npm run dist`

## CI / Release
- PR・main push: `verify` ジョブ（typecheck + test + build + macOS E2E smoke）
- macOS E2E実行時は `e2e-app.log` に対して `logs:kpi:check` を実行し、ログartifactも保存
  - 閾値は workflow `env` の `KPI_MAX_*` で調整可能
- `v*` タグまたは手動実行: `package` ジョブ（署名情報があれば署名付きビルド）
- `v*` タグ時は preflight で `package.json version` とタグ名の一致を必須チェック
- `v*` タグ: GitHub Release へ成果物添付

## 運用ドキュメント
- ログ/障害対応: `docs/operations/logging-runbook.md`
- 署名/リリース手順: `docs/operations/release-signing.md`
