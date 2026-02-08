# Chapter 0 — three.js と R3F の役割を理解する

この章ではコードを書きません。その代わり、これから扱う技術スタックの「どこが何を担当しているのか」を頭の中で整理します。

地味に感じるかもしれませんが、この整理をしないまま先に進むと、「この処理は React に書くのか、three.js に書くのか」で毎回迷うことになります。最初に全体像を掴んでおきましょう。


## three.js は「描画エンジン」

three.js は、ブラウザ上に 3D グラフィックスを描画するための JavaScript ライブラリです。内部では WebGL（GPU を使って画面にピクセルを描く低レベル API）を使っていますが、three.js がそれを抽象化してくれるので、私たちは「シーンにオブジェクトを置いて、カメラを設置して、レンダリングする」という高レベルな操作だけで 3D 表示ができます。

three.js を単体で使う場合、以下のようなコードを自分で書く必要があります。

```ts
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
```

Scene（空間）を作り、Camera（視点）を作り、Renderer（描画装置）を作り、アニメーションループを自分で回す。オブジェクトを追加したければ `scene.add(mesh)` で手動で登録し、不要になったら `scene.remove(mesh)` で取り除き、使い終わったジオメトリやマテリアルは `dispose()` でメモリを解放する。すべてが手動です。

このリポジトリの `src/pages/ThreeVanilla.tsx` に、three.js 単体で書いた実装があります。この段階で中身を細かく読む必要はありませんが、ファイルを開いて「けっこう長いな」という感覚だけ持っておいてください。


## R3F は「React と three.js をつなぐ橋」

React Three Fiber（R3F）は、three.js の機能を React のコンポーネントとして書けるようにするライブラリです。R3F は three.js の代替品ではありません。内部では three.js がそのまま動いています。R3F がやっているのは、React の宣言的な書き方と three.js の命令的な API を橋渡しすることです。

先ほどの Scene / Camera / Renderer のセットアップは、R3F では `<Canvas>` コンポーネント一つで完了します。

```tsx
<Canvas camera={{ position: [6, 6, 10], fov: 50 }}>
  <ambientLight intensity={0.6} />
  <mesh>
    <boxGeometry />
    <meshStandardMaterial color="orange" />
  </mesh>
</Canvas>
```

`<Canvas>` が自動で Scene と Renderer を作り、アニメーションループも回してくれます。立方体を追加したければ `<mesh>` を JSX に書くだけ。不要になったコンポーネントが消えれば、`<mesh>` など R3F が生成したオブジェクトの `dispose()` は自動で処理されます（`<primitive object={...}>` のように外部オブジェクトを渡す場合は別途管理が必要です）。

つまり、three.js を「手続き的に操作する」代わりに、React と同じ感覚で「今こうあるべき状態を宣言する」スタイルで 3D シーンを書けるのが R3F の価値です。


## 「描画」の責務と「状態管理」の責務

ここが一番大事なポイントです。

three.js（と R3F）が担うのは**描画の責務**です。「このオブジェクトをこの位置に、この色で、この角度で画面に描け」という命令を実行します。

一方、「今シーンにどんなオブジェクトがあるのか」「どれが選択されているのか」「ドラッグ中のオブジェクトはどれか」といった情報は、**React の state** で管理します。

```
React state（データの正解）  →  R3F コンポーネント（描画）
    ↑                                    |
    |                                    ↓
ユーザー操作（クリック、ドラッグ）  ←  three.js イベント
```

この流れを覚えておいてください。

1. React の state が「唯一の正解データ」を持つ
2. R3F コンポーネントは state を受け取って描画する
3. ユーザーが 3D シーン上で操作すると、イベントが発生する
4. イベントハンドラが state を更新する
5. state が変わったので React が再描画をかけ、3D シーンも更新される

この循環が、これから全チャプターを通じて繰り返し出てきます。「state を更新すれば画面が変わる」「画面を直接いじるのではなく state をいじる」——React を使ったことがあれば馴染み深い考え方ですが、3D の世界でも同じ原則が通用するということを、ここで確認しておきましょう。


## 実際のコードで確認してみよう

完成済みの `src/pages/R3FCore.tsx` を開いてみてください。ファイルの冒頭で `useState` を使ってオブジェクトの配列を定義し、その下の `<Canvas>` の中で `objects.map(...)` によって各オブジェクトを描画しています。

state がデータの正解であり、描画はそこから導出される。このシンプルな原則が、選択、移動、回転、削除とあらゆる機能の土台になっていることが見て取れるはずです。

もう一つ、`src/pages/ThreeVanilla.tsx` も覗いてみてください。こちらでは `scene.add()` や `scene.remove()` で 3D オブジェクトを直接操作しています。React の state という「正解データ」がないので、「今シーンに何があるか」はシーンオブジェクト自体を調べないとわかりません。どちらが良い悪いではなく、アプローチが違うのだということを感じ取ってもらえれば、この章の目的は達成です。


## この章のまとめ

three.js は 3D を描くエンジンであり、R3F は React から three.js を宣言的に使うための橋です。R3F を使う場合、「今のシーンの状態」は React の state が持ち、3D の描画は state から導出されます。

次の章からはいよいよコードを書きます。まずは `<Canvas>` に立方体を表示するところから始めましょう。
