# Chapter 6 — three.js 単体と比較する

最終章では、コードを新しく書く代わりに、ここまで R3F と drei で実装してきた機能を three.js 単体で書いた場合と比較します。目的は「R3F が何を抽象化しているのか」を明確にすることです。

「R3F のほうが良い」「three.js 単体のほうが良い」という優劣の話ではありません。どちらにも適した場面があります。その判断基準を、コードの責務の違いから読み取れるようになることがゴールです。


## 比較対象のファイル

このリポジトリには、同じ機能を異なるアプローチで実装したページがあります。

- `src/pages/R3FDrei.tsx` — React Three Fiber + drei で実装（このコースで書いてきたものの完成版）
- `src/pages/R3FCore.tsx` — React Three Fiber のコア機能のみで実装（drei を使わない参考実装）
- `src/pages/ThreeVanilla.tsx` — three.js 単体で実装

ブラウザで「ライブラリ比較」ページを開くと、タブで各実装を切り替えて比較できます。見た目と操作感はほぼ同じですが、コードの書き方はまるで違います。


## 初期化の違い

**three.js 単体の場合:**

`ThreeVanilla.tsx` を開くと、`useEffect` の中に以下のような初期化処理が並んでいるはずです。

```ts
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(width, height);
containerRef.current.appendChild(renderer.domElement);
```

Scene、Camera、Renderer をそれぞれ手動で生成し、Canvas 要素を DOM に追加し、ウィンドウのリサイズにも自分で対応する必要があります。さらにアニメーションループも自分で書きます。

```ts
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
```

**R3F の場合:**

```tsx
<Canvas camera={{ position: [6, 6, 10], fov: 50 }}>
```

これだけです。Scene と Renderer は `<Canvas>` が内部で生成し、リサイズ対応もアニメーションループも自動で行われます。R3F を使うことで、この「決まりきった初期化コード」を書かなくて済みます。


## オブジェクト追加・削除の違い

**three.js 単体の場合:**

```ts
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color });
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);
```

オブジェクトを追加するときは、Geometry と Material を手動で作り、Mesh にまとめて、`scene.add()` でシーンに登録します。削除するときは `scene.remove()` でシーンから取り除き、さらに Geometry と Material の `dispose()` を呼んで GPU メモリを解放する必要があります。

```ts
scene.remove(mesh);
geometry.dispose();
material.dispose();
```

この `dispose()` を忘れると、メモリリークの原因になります。オブジェクトが画面から消えていても、GPU 上にはデータが残り続けるためです。

**R3F の場合:**

```tsx
<mesh>
  <boxGeometry args={[1, 1, 1]} />
  <meshStandardMaterial color={obj.color} />
</mesh>
```

JSX を書くだけです。`<mesh>` や `<group>` のように R3F が生成したオブジェクトは、コンポーネントが DOM から消えれば（state から `filter` で除外すれば）、`dispose()` まで自動的に処理されます。


## 選択の違い

**three.js 単体の場合:**

立方体がクリックされたかどうかを判定するには、`Raycaster` を自前で使います。

```ts
window.addEventListener("click", (event) => {
  const mouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children);

  if (intersects.length > 0) {
    selectedMesh = intersects[0].object;
  }
});
```

マウス座標を正規化し、Raycaster で光線を飛ばし、当たったオブジェクトの中から最も手前のものを取得する——一連の処理をすべて自分で書く必要があります。

**R3F の場合:**

```tsx
<mesh onPointerDown={(event) => {
  event.stopPropagation();
  setSelectedId(obj.id);
}}>
```

R3F がレイキャストを内部で処理してくれるので、DOM イベントと同じ感覚で `onPointerDown` を書くだけです。ヒットテスト（何に当たったか）の計算はすべて R3F 側が行っています。


## ドラッグの違い

**three.js 単体の場合:**

three.js 単体でドラッグを実装する場合、以下の処理をすべて手動で管理することになります。

1. `mousedown` でドラッグ開始を検知する
2. `mousemove` でマウス座標を正規化する
3. `Raycaster` で平面との交点を計算する
4. 対象メッシュの `position` を直接書き換える
5. `mouseup` でドラッグ終了を処理する
6. イベントリスナーの登録と解除を忘れずに行う

**R3F + drei の場合:**

Chapter 4 で見た通り、drei の `TransformControls` を使えばドラッグ（移動・回転）がコンポーネント一つで実現できます。

```tsx
<TransformControls object={selectedObject} mode="translate" />
```

Raycaster の計算やイベントリスナーの管理は drei がすべて行ってくれます。


## 削除時の `dispose` の違い

ここが責務の差が最も顕著に出るところです。

three.js 単体では、オブジェクトを削除するとき「シーンからの除去」と「リソースの解放」を自分でやらなければなりません。

```ts
scene.remove(mesh);
mesh.geometry.dispose();
mesh.material.dispose();
// テクスチャがあればそれも dispose
```

R3F では、`<mesh>` / `<group>` など宣言的に作ったオブジェクトなら、コンポーネントが消えれば自動です。

```tsx
// filter でオブジェクトを除外すれば、R3F が dispose まで処理する（宣言的に作ったオブジェクトの場合）
setObjects((prev) => prev.filter((obj) => obj.id !== selectedId));
```

ただし `Chapter 5` の `<primitive object={...}>` のように、外部から渡したオブジェクトは自動破棄の対象外です。この場合は three.js 単体と同様に、必要に応じて明示的な `dispose()` が必要です。  
このとき、`useGLTF` のキャッシュ由来オブジェクトは複数箇所で共有されるため、アンマウント時に一律 `dispose()` すると他インスタンスを壊す可能性があります。  
`dispose()` は「そのコンポーネントが生成・所有したリソース」に限定して実行してください。

three.js 単体で `dispose` を忘れたり漏らしたりするバグは、実際のプロジェクトでもよくある問題です。R3F は多くのケースでこの負担を自動化してくれるため、メモリ管理に関するバグのリスクを減らせます。


## 比較の整理

| 観点 | three.js 単体 | R3F + drei |
|---|---|---|
| 初期化 | Scene / Camera / Renderer を手動生成 | `<Canvas>` に集約 |
| アニメーションループ | `requestAnimationFrame` を自分で回す | 自動 |
| オブジェクト追加 | `scene.add()` | JSX を書く |
| オブジェクト削除 | `scene.remove()` + `dispose()` | state から除外（`primitive` は別途管理） |
| クリック判定 | `Raycaster` + `intersectObjects` を手動 | `onPointerDown` |
| ドラッグ移動 | Raycaster + 平面交差計算を手動 | `<TransformControls>` |
| カメラ操作 | `OrbitControls` を手動でセットアップ | `<OrbitControls />` |
| メモリ管理 | 手動で `dispose()` | 多くは自動（`primitive` は手動管理） |
| React との連携 | 自前で同期が必要 | ネイティブ対応 |


## three.js 単体が適している場面

R3F + drei の利便性は大きいですが、three.js 単体のほうが適している場面もあります。

- **React を使わないプロジェクト** — 当然ながら R3F は React 前提です。Vue や Svelte、あるいはフレームワークなしのプロジェクトでは three.js 単体を使うことになります。
- **描画パフォーマンスが最優先の場面** — R3F は React のレンダリングサイクルを経由するため、数千〜数万のオブジェクトを毎フレーム更新するような場面では、three.js 側のオブジェクトを直接操作したほうが速い場合があります（R3F でも `useFrame` + ref で直接操作は可能です）。
- **既存の three.js コードベースがある場合** — すでに three.js で動いているプロジェクトに R3F を混ぜるのは、全面的な書き直しになりがちです。


## ここからどう進むか

このコースでは R3F のコア機能と drei を使って、選択・回転・削除・ドラッグ移動・カメラ制御・モデル読み込みという一通りの操作を実装してきました。

次のステップとして考えられる方向性をいくつか挙げます。

**drei の他の機能を探る方向:**
- `Html` コンポーネントで 3D シーン内に HTML 要素を配置する
- `Environment` でリアルな環境光を設定する
- `useAnimations` で GLTF モデルのアニメーションを再生する
- `@react-three/postprocessing` でポストエフェクト（ブルーム、被写界深度など）を試す

**R3F をさらに深掘りする方向:**
- `useRef` でメッシュを直接操作するパターンを学ぶ（パフォーマンス最適化）
- drei を使わずに `OrbitControls` や `Raycaster` を自分で組み込む（`src/pages/R3FCore.tsx` が参考になります）

**three.js の基礎を固める方向:**
- シェーダー（GLSL）の基礎を学んで、カスタムマテリアルを書く
- 物理エンジン（Cannon.js や Rapier）と連携する
- パーティクルシステムやインスタンスメッシュによるパフォーマンス最適化

どちらの方向に進むにしても、「R3F は three.js を React で扱う橋である」「state が正解データであり描画は導出される」という 2 つの原則は変わりません。このコースで身につけた考え方は、今後の学習の土台として機能し続けるはずです。
