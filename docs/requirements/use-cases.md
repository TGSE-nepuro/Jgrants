# Use Cases

## UC-01: 公募検索
- Actor: 事業者担当者
- Trigger: キーワードや地域を入力して検索
- Flow:
  1. 検索条件を入力
  2. APIへ検索リクエスト
  3. 一覧表示
- Success criteria: 5秒以内で結果表示

## UC-02: 公募詳細確認
- Actor: 事業者担当者
- Trigger: 検索結果から公募を選択
- Flow:
  1. 公募IDで詳細取得
  2. 要件・期間・問い合わせ先を表示
- Success criteria: 3秒以内で詳細表示

## UC-03: お気に入り保存
- Actor: 事業者担当者
- Trigger: 詳細画面で保存操作
- Flow:
  1. ローカル保存
  2. 再起動後も表示可能
- Success criteria: 永続化されること

## UC-04: 比較CSV出力
- Actor: 事業者担当者
- Trigger: 複数公募を選択して出力
- Flow:
  1. 対象選択
  2. CSV生成
  3. 保存
- Success criteria: Excelで読めるCSV形式
