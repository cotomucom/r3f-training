# Chapter 4 — drei を導入する

Chapter 0〜3 で学んだ Canvas、state 管理、選択、回転、削除は、R3F のコア機能だけで実現できました。これらの機能は `@react-three/drei` を使っても使わなくても変わりません。

しかし、カメラ操作やオブジェクトのドラッグ移動を自分で実装しようとすると、途端に複雑になります。three.js の `OrbitControls` をライフサイクル管理付きでセットアップしたり、`Raycaster` で光線と平面の交差計算を書いたり、毎フレームの座標更新をループで回したり——決して難しくはありませんが、コード量が一気に増えます。

この章では `@react-three/drei` を導入して、カメラ操作とドラッグ移動をコンポーネント数行で追加します。


## drei とは

`@react-three/drei`（ドライ）は、R3F の上に「よく使う部品」を集めたライブラリです。three.js の `examples/jsm/` ディレクトリにある便利クラス（`OrbitControls`、`TransformControls` など）を、React コンポーネントとして使えるようにラップしています。

drei を使っても、R3F のコア原則は変わりません。state が正解データであり、描画は state から導出される。この流れは drei を導入しても同じです。drei は「書き方を短くしてくれる」だけで、構造を変えるものではありません。

> **drei を使わない場合**: カメラ操作のための `OrbitControls` は、自分で `import` し、`useEffect` でインスタンスを生成し、`requestAnimationFrame` で `update()` を呼び、コンポーネントのアンマウント時に `dispose()` する——というコードを書く必要があります。ドラッグ移動のための `TransformControls` も同様に、three.js から import して `useEffect` でライフサイクル管理をし、イベントの登録・解除を自分で書くことになります。drei はこれらをすべて内部で処理してくれます。


## import を追加する

`@react-three/drei` から `OrbitControls` と `TransformControls` を import します。React のフックもいくつか追加が必要です。

```tsx
import { OrbitControls, TransformControls } from "@react-three/drei";
import { useRef, useState } from "react";
import * as THREE from "three";
```

`useRef` は three.js のメッシュオブジェクトの参照を保持するために使います。`THREE` は three.js 本体を名前空間としてまとめて import する省略記法で、`THREE.Mesh` のように型を参照できるようにするためです。


## OrbitControls でカメラを操作する

まずはカメラ操作から。`<Canvas>` の中に `<OrbitControls />` を 1 行追加するだけです。

```tsx
<Canvas camera={{ position: [6, 6, 10], fov: 50 }} ...>
  <ambientLight intensity={0.6} />
  <directionalLight position={[5, 8, 3]} intensity={0.8} />
  <gridHelper args={[20, 20, "#3b3b3b", "#2a2a2a"]} />

  <OrbitControls />

  {/* ... objects.map(...) ... */}
</Canvas>
```

これだけで、以下の操作が使えるようになります。

- **左ドラッグ** — シーンの中心を軸にカメラを回転する
- **ホイール** — ズームイン・ズームアウト
- **右ドラッグ** — カメラを平行移動（パン）する

ブラウザで試してみてください。背景をドラッグするとカメラが回り、ホイールでズームできるはずです。マウスを離した後にカメラがふわっと減速して止まるのは、drei の `OrbitControls` がデフォルトでダンピング（減衰）を有効にしているためです。


## MeshItem コンポーネントを分離する

次にドラッグ移動を追加しますが、その前に準備が必要です。

drei の `TransformControls` は、操作対象の three.js オブジェクト（`Mesh`）の**参照**を必要とします。React の世界では state でデータを管理していますが、`TransformControls` は three.js のオブジェクトを直接つかんで動かす仕組みなので、「どのメッシュを操作するか」を three.js のオブジェクト参照で指定しなければなりません。

そのために、1 つの立方体を描画する `MeshItem` コンポーネントを分離し、内部で `ref` を使ってメッシュの参照を親に渡す仕組みを作ります。

```tsx
type MeshItemProps = {
  data: SceneObject;
  selected: boolean;
  onSelect: (id: string) => void;
  register: (id: string, mesh: THREE.Mesh | null) => void;
};

function MeshItem({ data, selected, onSelect, register }: MeshItemProps) {
  return (
    <mesh
      ref={(mesh) => register(data.id, mesh)}
      position={data.position}
      rotation={data.rotation}
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect(data.id);
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={data.color}
        emissive={selected ? "#222222" : "#000000"}
      />
    </mesh>
  );
}
```

ポイントは `ref={(mesh) => register(data.id, mesh)}` の部分です。R3F の `<mesh>` にコールバック ref を渡すと、メッシュが three.js 側で生成されたタイミングで呼ばれます。`register` を通じてこの参照を親コンポーネントに伝えることで、親が「ID → メッシュオブジェクト」の対応を把握できるようになります。

親コンポーネント側（`Playground()`）では、`useRef` で参照マップを用意します。

```tsx
const meshMapRef = useRef<Record<string, THREE.Mesh | null>>({});
```

`useRef` を使う理由は、このマップの変更が再描画を引き起こす必要がないからです。`useState` で持つと、メッシュが登録されるたびに再描画が走ってしまいます。`useRef` なら値が変わっても再描画されません。

そして、選択中のメッシュオブジェクトを取得する式を追加します。

```tsx
const selectedMesh = selectedId ? meshMapRef.current[selectedId] : null;
```

`objects.map(...)` の中で、`<mesh>` の代わりに `<MeshItem>` を使うように書き換えます。

```tsx
{objects.map((obj) => (
  <MeshItem
    key={obj.id}
    data={obj}
    selected={obj.id === selectedId}
    onSelect={setSelectedId}
    register={(id, mesh) => {
      meshMapRef.current[id] = mesh;
    }}
  />
))}
```

`register` に渡しているのは、「メッシュが生成されたら呼んでほしいコールバック関数」です。`MeshItem` 内で three.js の mesh が生成されると、この関数が `(data.id, mesh)` という引数で呼ばれます。

`meshMapRef.current[id] = mesh;` は、オブジェクトの ID をキーにして、three.js の mesh 参照を `meshMapRef` に保存しています。これにより、後で `selectedId` から対応する mesh オブジェクトを取り出せるようになります（`selectedMesh = meshMapRef.current[selectedId]`）。

つまり、「React の state で管理している ID」と「three.js のオブジェクト参照」を結びつけるための登録処理です。


## TransformControls でオブジェクトを操作する

メッシュの参照が取れるようになったので、`TransformControls` を追加します。選択中のオブジェクトがあるときだけ表示します。

```tsx
{selectedMesh && (
  <TransformControls
    object={selectedMesh}
    mode={mode}
  />
)}
```

`object` に操作対象のメッシュ参照を渡し、`mode` で操作の種類を指定します。`"translate"` なら移動、`"rotate"` なら回転です。

`mode` を切り替えるための state とボタンを追加しましょう。

```tsx
const [mode, setMode] = useState<"translate" | "rotate">("translate");
```

```tsx
  <div className="controls">
    <button
      className={mode === "translate" ? "primary" : ""}
      onClick={() => setMode("translate")}
    >
      移動モード
    </button>
    <button
      className={mode === "rotate" ? "primary" : ""}
      onClick={() => setMode("rotate")}
    >
      回転モード
    </button>
    <button onClick={deleteSelected}>
      選択を削除
    </button>
  </div>
```

Chapter 3 で作った「選択を回転 (+30°)」ボタンはもう不要です。`TransformControls` の回転モードで、マウスで自由に回転できるようになったからです。ボタンを残しても問題はありませんが、操作が重複するので整理しておくとすっきりします。


## OrbitControls と TransformControls の競合を解決する

ここで一つ問題が起きます。`OrbitControls` と `TransformControls` は、どちらもマウスのドラッグ操作で動作します。オブジェクトを動かしたいのにカメラが回ってしまう、という事故が発生します。

解決策は、`TransformControls` の操作中だけ `OrbitControls` を無効化することです。

```tsx
const [orbitEnabled, setOrbitEnabled] = useState(true);
```

`TransformControls` に `onMouseDown` / `onMouseUp` イベントを追加して、操作中のフラグを切り替えます。

```tsx
{selectedMesh && (
  <TransformControls
    object={selectedMesh}
    mode={mode}
    onMouseDown={() => setOrbitEnabled(false)}
    onMouseUp={() => setOrbitEnabled(true)}
  />
)}
```

そして `<OrbitControls>` に `enabled` を渡します。

```tsx
<OrbitControls enabled={orbitEnabled} />
```

`onMouseDown` でオブジェクトの操作が始まったらカメラ操作を止め、`onMouseUp` で操作が終わったらカメラ操作を再開する。シンプルな仕組みですが、これだけで入力の競合が解消されます。


## TransformControls の結果を state に反映する

ここが、この章で最も重要なポイントです。

`TransformControls` は、操作対象の three.js オブジェクトの `position` と `rotation` を**直接書き換えます**。つまり、React の state を経由せずに、three.js 側のオブジェクトが動いてしまいます。

Chapter 0 で確認した「state が正解データ」の原則を思い出してください。  
TransformControls は three.js オブジェクトを直接更新するため、state に書き戻しをしないと、後で `objects` を更新する処理（回転・削除・追加など）が走ったタイミングで、見た目と state の不一致が問題になることがあります。  

これを防ぐために、`TransformControls` の操作結果を state に同期する関数を用意します。

```tsx
const syncSelectedToState = () => {
  if (!selectedId || !selectedMesh) return;

  const nextPosition: [number, number, number] = [
    selectedMesh.position.x,
    selectedMesh.position.y,
    selectedMesh.position.z,
  ];
  const nextRotation: [number, number, number] = [
    selectedMesh.rotation.x,
    selectedMesh.rotation.y,
    selectedMesh.rotation.z,
  ];

  setObjects((prev) =>
    prev.map((obj) =>
      obj.id === selectedId
        ? { ...obj, position: nextPosition, rotation: nextRotation }
        : obj
    )
  );
};
```

three.js のメッシュから `position` と `rotation` を読み取り、state に反映しています。`TransformControls` の `onMouseUp` でこの関数を呼ぶことで、操作後に state が最新の状態に保たれます。

```tsx
{selectedMesh && (
  <TransformControls
    object={selectedMesh}
    mode={mode}
    onMouseDown={() => setOrbitEnabled(false)}
    onMouseUp={() => {
      setOrbitEnabled(true);
      syncSelectedToState();
    }}
  />
)}
```

> ドラッグ操作中も state と同期させたい場合は `onMouseUp` だけでなく `onChange` 内でも`syncSelectedToState` を呼びますが、更新回数が増えるためパフォーマンスの悪化に注意が必要です。

この「three.js 側の変更を state に同期する」パターンは、drei を使う場面でよく出てきます。drei のコンポーネントは three.js のオブジェクトを直接操作するものが多いので、操作結果を state に反映する責務は自分で書く必要があるのです。


## 動作確認

ブラウザで以下を確認してください。

- 背景をドラッグすると、カメラがシーンの中心を軸に回転する
- ホイールでズームイン・ズームアウトができる
- 立方体をクリックすると、TransformControls のギズモ（矢印のハンドル）が表示される
- 「移動モード」でギズモの矢印をドラッグすると、立方体が移動する
- 「回転モード」で操作すると、立方体が回転する
- オブジェクトを操作している最中は、カメラが回らない
- 「選択を削除」で削除した後、TransformControls のギズモが消える

TransformControls のギズモが表示されない場合は、`selectedMesh` が `null` になっていないか確認してください。`meshMapRef` への登録が正しく行われているか（`register` 関数が呼ばれているか）をチェックしましょう。

オブジェクトを動かした後に別のオブジェクトを選択すると元の位置に戻ってしまう場合は、`syncSelectedToState` が呼ばれていません。


## 練習

- `OrbitControls` に `maxDistance={30}` と `minDistance={3}` を追加して、ズームの範囲を制限してみてください。
- `TransformControls` の `mode` に `"scale"` を追加して、オブジェクトの拡大縮小を試してみてください。ボタンを 3 つに増やし、`syncSelectedToState` で `scale` も読み取って state に反映する必要があります。
- `TransformControls` に `size={0.8}` を追加して、ギズモの大きさを変えてみてください。
