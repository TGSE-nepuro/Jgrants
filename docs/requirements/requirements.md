# Requirements (MVP)

## Functional Requirements
- FR-01: JグランツAPI v2優先、未対応時はv1フォールバック
- FR-02: キーワード、地域、募集期間で検索
- FR-03: 公募詳細（概要、期間、対象、問い合わせ先）表示
- FR-04: お気に入り登録・削除
- FR-05: 比較CSV出力
- FR-06: APIトークンを安全に保存

## Non-Functional Requirements
- NFR-01: macOS / Windows対応
- NFR-02: 初回表示2秒以内、通常操作5秒以内
- NFR-03: APIエラー時の再試行導線
- NFR-04: ログはPIIをマスク

## Scope
- In Scope: 検索、詳細、お気に入り、CSV出力、設定
- Out of Scope: 申請自動化、通知配信、外部SaaS連携

## Priority
- P0: FR-01, FR-02, FR-03, FR-06
- P1: FR-04, FR-05
