# three.js / R3F / drei 比較メモ

この文書は「同じことをするのに、three.js単体・R3F・dreiで何が簡略化されるか」を初心者向けに整理したものです。
（前提: 本プロジェクトの依存バージョンは `three@0.182.0` / `@react-three/fiber@9.5.0` / `@react-three/drei@10.7.7`）

## まず結論
- **three.js単体**: 自分で `Scene/Camera/Renderer` を組み立て、描画ループも手動。
- **R3F**: Reactコンポーネントで書ける。**stateがシーンの正解データ**になる。
- **drei**: R3Fの上に「よく使う部品」を追加。**便利機能がさらに短く書ける**。

---

## 1. 「シーンと描画の準備」

### three.js単体
- `Scene`, `Camera`, `Renderer` を自分で作る
- `renderer.domElement` をDOMに追加する
- `requestAnimationFrame` で自前の描画ループ

### R3F
- `Canvas` を置くだけで `Scene/Camera/Renderer` が自動で用意される
- 描画ループは `useFrame` で書く（必要な場合だけ）

### drei
- R3Fと同じ。描画の土台は `Canvas` のまま

---

## 2. 「オブジェクトの追加」

### three.js単体
- `new Mesh(geometry, material)` を作成
- `scene.add(mesh)` で追加
- 位置や回転は `mesh.position` / `mesh.rotation`

### R3F
- `<mesh>` や `<boxGeometry>` をJSXで書ける
- Reactのstateで `position` や `rotation` を管理できる

### drei
- R3Fと同じだが、補助コンポーネントを使える

---

## 3. 「選択（クリック判定）」

### three.js単体
- `Raycaster` を作って `setFromCamera` する
- `intersectObjects` で衝突判定

### R3F
- `<mesh onPointerDown={...}>` のように書ける
- R3Fが内部でRaycaster処理をしてくれる

### drei
- R3Fと同じ。さらに補助フックも使える場合がある

---

## 4. 「ドラッグで移動」

### three.js単体
- `Raycaster` + 交差平面の計算
- `TransformControls` を自分で追加することも多い

### R3F
- `useThree` でカメラとRaycasterにアクセス
- `onPointerDown / onPointerMove / onPointerUp` などのポインタイベントでドラッグを実装できる
- state更新で位置を変えられる（必要なら `useFrame` で補間・慣性などの連続更新も可能）

### drei
- **`TransformControls` をコンポーネントとして使える**
- 対象は「子として包む」か `object={ref}` のように参照を渡して指定する
- OrbitControls など他の操作系と併用する場合は、干渉しないように制御することが多い

---

## 5. 「視点操作（Orbit）」

### three.js単体
- `OrbitControls` を自分で生成
- `enableDamping` や `autoRotate` を使う場合は `controls.update()` を描画ループで呼ぶ（それ以外は必須ではない）

### R3F
- 自前で用意してもよいが、少し手間

### drei
- **`<OrbitControls />` を置くだけ**

---

## 6. 「削除」

### three.js単体
- `scene.remove(mesh)`
- `geometry.dispose()` / `material.dispose()` でメモリ解放

### R3F
- state配列から対象を消すだけで「表示から消える」
- 多くの場合はアンマウント時に自動で `dispose` されるが、外部で共有しているリソースは意図せず破棄しないよう注意（必要なら `dispose={null}` などで制御）

### drei
- R3Fと同じ

---

## まとめ（同じ目的の書き方の違い）

| やりたいこと | three.js単体 | R3F | drei |
|---|---|---|---|
| シーン準備 | 自分で全部 | `Canvas` で自動 | R3Fと同じ |
| オブジェクト配置 | `scene.add` | JSXで書く | R3Fと同じ |
| クリック選択 | Raycaster手動 | onPointerDown | R3Fと同じ |
| ドラッグ移動 | 手動 or TransformControls | ポインタイベント + state | TransformControlsコンポーネント |
| 視点操作 | OrbitControls手動 | 手動（自前でOrbitControls等） | `<OrbitControls />` |
| 削除 | remove + dispose | stateから削除 | R3Fと同じ |
