# three.js / R3F 学習プロジェクト

React 初学者向けに、`three.js` と `@react-three/fiber` を使った段階学習教材です。

## ライセンス

- 本リポジトリの自作部分は `LICENSE` の独自許諾に従います。
  - 利用形態を問わず、権利者の事前許諾が必要です。
- 第三者ライブラリ部分は各ライブラリのライセンスが優先されます。
  - 詳細: `THIRD_PARTY_NOTICES.md`
  - 全依存一覧: `THIRD_PARTY_LICENSES.csv`

## 起動

```bash
npm install
npm run dev
```
## 教材マークダウンファイル

- `docs/course/00_environment.md`
- `docs/course/01_min_scene.md`
- `docs/course/02_selection.md`
- `docs/course/03_drag.md`
- `docs/course/04_rotate_delete.md`
- `docs/course/05_camera_controls.md`
- `docs/course/06_gltf_loader.md`
- `docs/course/07_threejs_comparison.md`

## 要素ごと比較ページ

- `src/pages/ThreeVanilla.tsx`
- `src/pages/R3FCore.tsx`
- `src/pages/R3FDrei.tsx`
- 要素比較(ブラウザ上への表示なし): `docs/course/COMPARISON.md`
