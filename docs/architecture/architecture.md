# Architecture

## Stack
- Electron
- TypeScript
- React + Vite
- Zustand

## Layers
- main process: lifecycle, IPC, secure storage
- preload: contextBridge
- renderer: UI, state
- shared: types, constants

## Security Baseline
- nodeIntegration: false
- contextIsolation: true
- tokenはOS安全領域に保存（後続実装）

## API Strategy
- v2優先
- v1フォールバック
- Adapterでレスポンスを共通DTOに正規化
