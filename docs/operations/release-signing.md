# Release Signing Guide

## 1. 対象
- macOS: 署名 + Notarization
- Windows: コード署名

## 2. GitHub Secrets
- `CSC_LINK`: 証明書バイナリ（base64 or URL）
- `CSC_KEY_PASSWORD`: 証明書パスワード
- `APPLE_ID`: Apple Developerアカウント
- `APPLE_APP_SPECIFIC_PASSWORD`: app-specific password
- `APPLE_TEAM_ID`: Apple Team ID

## 3. リリース手順
1. `main` がCI Greenであることを確認
2. `vX.Y.Z` タグを作成して push
3. GitHub Actions の `package` / `release` ジョブ完了を確認
4. Releaseページで成果物 (`dmg`, `exe`, `zip`) を検証

## 4. 失敗時
- 証明書失効/不一致: `CSC_LINK` / `CSC_KEY_PASSWORD` を再確認
- Notarization失敗: `APPLE_*` シークレットと権限を確認
- Windows署名失敗: PFX形式とタイムスタンプ到達性を確認
