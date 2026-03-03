# Implementation Plan (Phase 3)

## Task Breakdown
1. プロジェクト初期化（package, tsconfig, vite）
2. Electron main/preload 実装
3. Renderer MVP UI実装
4. APIクライアント実装（v2優先）
5. お気に入り永続化
6. CI（GitHub Actions）

## Dependencies
- 1 -> 2,3,4,5
- 2 + 3 + 4 + 5 -> 6

## Exit Criteria
- npm run typecheck 成功
- npm run build 成功
