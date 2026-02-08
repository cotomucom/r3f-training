# Chapter 5 — 3D モデルを読み込む

ここまで扱ってきたのは `<boxGeometry>` で生成したシンプルな立方体でした。しかし実際のアプリケーションでは、Blender や他の 3D ソフトで作成したモデルを読み込んで使うことがほとんどです。この章では、GLTF 形式の 3D モデルファイルを R3F で表示し、既存の選択システムに統合する方法を学びます。


## GLTF とは

GLTF（GL Transmission Format）は、Web での 3D モデル配信を目的としたファイル形式です。テクスチャやアニメーションも含められて、ファイルサイズも比較的小さいため、three.js / R3F の世界では事実上の標準フォーマットになっています。

拡張子は `.gltf`（JSON ベースのテキスト形式）と `.glb`（バイナリ形式）の 2 種類があります。`.glb` のほうがファイルサイズが小さく、1 ファイルに全データがまとまるので扱いやすいです。

練習用のモデルは https://github.com/KhronosGroup/glTF-Sample-Models などから入手できます。ダウンロードした `.glb` ファイルを `public/models/` ディレクトリに配置してください（`public/models/` がなければ作成してください）。


## import を追加する

drei の `useGLTF` フックと React の `useMemo` 、R3Fの `ThreeEvent` を追加で import します。

```tsx
import { OrbitControls, TransformControls, useGLTF } from "@react-three/drei";
import { useState, useRef, useMemo } from "react";
import { Canvas, ThreeEvent } from "@react-three/fiber";
```

`useGLTF` は drei が提供する GLTF 読み込み専用のフックです。内部では R3F の `useLoader` と three.js の `GLTFLoader` を組み合わせて動作していますが、drei がその設定をすべて隠蔽してくれるので、パスを渡すだけで使えます。


## モデル表示コンポーネントを作る

GLTF モデルの表示と選択イベントを担当するコンポーネントを作ります。

```tsx
function GltfModel({
  path,
  position,
  rotation,
  onSelect,
}: {
  path: string;
  position: [number, number, number];
  rotation: [number, number, number];
  onSelect: () => void;
}) {
  const { scene } = useGLTF(path);
  const model = useMemo(() => scene.clone(true), [scene]);

  return (
    <primitive
      object={model}
      position={position}
      rotation={rotation}
      scale={1}
      onPointerDown={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        onSelect();
      }}
    />
  );
}
```

いくつか新しい要素が出てきたので、順に見ていきましょう。

**`useGLTF(path)`:**
ファイルパスを渡すと、GLTF の読み込み結果を返します。パスは `public` ディレクトリからの相対パスです。たとえば `public/models/duck.glb` に置いたファイルなら、`"/models/duck.glb"` と指定します。戻り値には `scene`（3D モデルのオブジェクトツリー）が含まれており、分割代入で取り出しています。

**`scene.clone(true)`:**
GLTF の読み込み結果に含まれる `scene` は、three.js の `Object3D` ツリーです。そのまま使うと、同じモデルを複数箇所に配置したときに参照を共有してしまい、一方を動かすともう一方も動く、といった事故が起きます。`clone(true)` で深いコピーを作ることで、この問題を回避します。

`useMemo` で包んでいるのは、コンポーネントが再描画されるたびにクローンを作り直さないようにするためです。依存配列に `scene` を入れておけば、読み込みが完了した最初の 1 回だけクローンが作られます。

> 実務補足: `scene.clone(true)` は静的モデルでは有効ですが、スキンメッシュやボーンアニメーション付きモデルでは不十分な場合があります。その場合は `SkeletonUtils.clone(scene)` を使い、インスタンスごとに `AnimationMixer` を分けて管理します。

**`<primitive object={model} />`:**
R3F で three.js のオブジェクトをそのままシーンに挿入するためのコンポーネントです。`<mesh>` や `<group>` では表現できない複雑な構造（GLTF のように子オブジェクトがネストしている場合）に使います。`scale` でモデルの大きさを調整できます。モデルによっては巨大だったり極小だったりするので、表示を見ながら調整してください。

実務では `position` / `rotation` も props で受け取り、`objects` state から渡して「表示は state から導出される」状態を保つのが基本です。


## 「読み込めた」と「操作できる」は別の問題

ここで一度立ち止まって考えてみましょう。上のコンポーネントで GLTF モデルを画面に表示することはできましたが、このモデルを Chapter 2〜4 で作った選択・回転・削除・ドラッグの仕組みに組み込むには、もう一段階の作業が必要です。

今の `objects` state は立方体を前提としたデータ構造です。モデルを操作対象にするには、`SceneObject` 型を**判別共用体（discriminated union）** に変更します。
このとき、Chapter 1 で作った既存の `SceneObject` 定義は残さず、以下で完全に置き換えてください（重複定義にすると TypeScript エラーになります）。

```tsx
type BaseObject = {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
};

type BoxObject = BaseObject & {
  kind: "box";
  color: string;
};

type ModelObject = BaseObject & {
  kind: "model";
  modelPath: string;
};

export type SceneObject = BoxObject | ModelObject;
```

`kind` フィールドで型を判別し、TypeScript が「`kind === "model"` なら `modelPath` が必ず存在する」と推論できるようにしています。これにより、`modelPath` に `?` や `!` を使う必要がなくなります。

既存の立方体には `kind: "box"` を付け、モデルには `kind: "model"` と `modelPath` を持たせてください。

`objects` の初期値は、例えば次のように書けます。

```tsx
const [objects, setObjects] = useState<SceneObject[]>([
  {
    kind: "box",
    id: "a",
    name: "Cube A",
    color: "#ff8c61",
    position: [-2, 0.5, 0],
    rotation: [0, 0, 0],
  },
  {
    kind: "box",
    id: "b",
    name: "Cube B",
    color: "#5fa8ff",
    position: [0, 0.5, 0],
    rotation: [0, 0, 0],
  },
  {
    kind: "model",
    id: "m1",
    name: "Duck",
    modelPath: "/models/duck.glb",
    position: [2, 0.5, 0],
    rotation: [0, 0, 0],
  },
]);
```

> `modelPath` は `public/models/` に置いた実際のファイル名に合わせて変更してください。

また、Chapter 4 で作った `MeshItem` コンポーネントの props も変更が必要です。`SceneObject` が判別共用体になったことで、`data: SceneObject` のままだと `data.color` にアクセスできなくなります（`ModelObject` には `color` がないため）。`MeshItem` は立方体専用なので、`data: BoxObject` に変更してください。

```tsx
type MeshItemProps = {
  data: BoxObject;  // SceneObject から BoxObject に変更
  selected: boolean;
  onSelect: (id: string) => void;
  register: (id: string, mesh: THREE.Mesh | null) => void;
};
```

描画時に `kind` で分岐します。

```tsx
{objects.map((obj) =>
  obj.kind === "box" ? (
    <MeshItem
      key={obj.id}
      data={obj}
      selected={obj.id === selectedId}
      onSelect={setSelectedId}
      register={(id, mesh) => {
        meshMapRef.current[id] = mesh;
      }}
    />
  ) : (
    <GltfModel
      key={obj.id}
      path={obj.modelPath}
      position={obj.position}
      rotation={obj.rotation}
      onSelect={() => setSelectedId(obj.id)}
    />
  )
)}
```

`obj.kind === "box"` で分岐した後、TypeScript は自動的に `obj` の型を `BoxObject` に絞り込みます。そのため、else 側では `obj.modelPath` が `string` 型であることが保証され、`!` による非 null アサーションは不要です。

このように、表示の仕組みと操作の仕組みを分離しておくと、新しい種類のオブジェクト（球体、円柱、別のモデル等）を追加するときにも同じパターンで拡張できます。判別共用体を使うことで、型安全性を保ちながら柔軟に対応できます。

モデルにも TransformControls によるドラッグ・回転を適用したい場合は、`GltfModel` にも `MeshItem` と同じ `register` パターンを追加して、メッシュ参照を親に渡す必要があります。ただし、モデルは立方体と違って形状が複雑なので、当たり判定の基準点や接地面をどう決めるかは別途検討が必要です。この章ではまず「表示して選択できる」ところまでを目標にします。


## 動作確認

ブラウザで以下を確認してください。

- GLTF モデルがシーン上に表示されている
- モデルをクリックすると選択状態が変わる（`selectedId` が更新される）
- 既存の立方体の操作（選択・ドラッグ・回転・削除）が壊れていない

モデルが表示されない場合、最もよくある原因は以下の 3 つです。

1. **ファイルのパスが間違っている** — `public/models/` に置いたファイル名と、コード内のパス文字列が一致しているか確認してください。
2. **ファイルが `public` ディレクトリ外にある** — URL パスで読み込む場合、ファイルは `public` ディレクトリに置く必要があります。`src` に置いたアセットは `import` 文経由でなら利用できますが、`"/models/duck.glb"` のような URL パスでは配信されません。
3. **モデルが極小または極大** — `scale` を `0.01` や `100` に変えてみてください。モデルの元サイズは作成者によってまちまちです。

モデルは表示されるがクリックしても選択されない場合は、`<primitive>` に `onPointerDown` が正しく渡されているか確認してください。一部のモデルでは子メッシュが深くネストしていて、`stopPropagation` がうまく機能しない場合があります。


## 練習

- 2 つ以上の GLTF モデルを `objects` に追加して、ID で正しく選択が切り替わるか確認してみてください。
- モデルの `scale` を変えて、操作しやすい大きさを探ってみてください。
- モデルの `position` / `rotation` を state 側で変更して、`<GltfModel>` 経由で表示に反映されることを確認してみてください。
