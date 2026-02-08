// Canvas: R3Fの描画ルート。three.jsのrenderer/scene/cameraを内包する。
// OrbitControls/TransformControls: dreiが提供する操作系コンポーネント。
// useMemo/useRef/useState: Reactのフック。state管理や参照保持に使う。
// THREE: three.js本体。型やクラスを参照するために使う。
import { Canvas } from "@react-three/fiber";
import { OrbitControls, TransformControls } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { SceneObject } from "./R3FCore";

type MeshItemProps = {
  data: SceneObject;
  selected: boolean;
  onSelect: (id: string) => void;
  register: (id: string, mesh: THREE.Mesh | null) => void;
};

// 1つの立方体を描画し、クリックで選択できるようにする部品。
// ここではdreiのTransformControlsが使えるように、mesh参照を親に返す。
function MeshItem({ data, selected, onSelect, register }: MeshItemProps) {
  const materialColor = selected ? "#ffffff" : data.color;
  return (
    <mesh
      ref={(mesh) => register(data.id, mesh)}
      position={data.position}
      rotation={data.rotation}
      onClick={(event) => {
        // クリックでこの立方体を選択する。
        event.stopPropagation();
        onSelect(data.id);
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={materialColor} emissive={selected ? "#222222" : "#000000"} />
    </mesh>
  );
}

// dreiの機能を使ったページ。
export default function R3FDrei() {
  // 3Dオブジェクトの一覧。配列をstateで管理する。
  const [objects, setObjects] = useState<SceneObject[]>([
    {
      id: "a",
      name: "Cube A",
      color: "#ff8c61",
      position: [-2, 0.5, 0],
      rotation: [0, 0, 0],
    },
    {
      id: "b",
      name: "Cube B",
      color: "#5fa8ff",
      position: [0, 0.5, 0],
      rotation: [0, 0, 0],
    },
    {
      id: "c",
      name: "Cube C",
      color: "#f9d65c",
      position: [2, 0.5, 0],
      rotation: [0, 0, 0],
    },
  ]);
  // どの立方体が選択されているかをIDで持つ。
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // TransformControlsのモードをUIで切り替える。
  const [mode, setMode] = useState<"translate" | "rotate">("translate");
  // 視点操作を一時停止するためのフラグ。
  const [orbitEnabled, setOrbitEnabled] = useState(true);

  // dreiのTransformControlsは「object」参照で操作対象を切り替えられる。
  const meshMapRef = useRef<Record<string, THREE.Mesh | null>>({});
  const selectedObject = selectedId ? meshMapRef.current[selectedId] : null;

  // 選択中の名前を表示用に計算する。
  const selectedName = useMemo(
    () => objects.find((obj) => obj.id === selectedId)?.name ?? "なし",
    [objects, selectedId]
  );

  // TransformControlsで動かした結果をstateに書き戻す。
  const syncSelectedToState = () => {
    // 選択が無い、または参照が無い場合は何もしない。
    if (!selectedId || !selectedObject) return;
    const nextPosition: [number, number, number] = [
      selectedObject.position.x,
      selectedObject.position.y,
      selectedObject.position.z,
    ];
    const nextRotation: [number, number, number] = [
      selectedObject.rotation.x,
      selectedObject.rotation.y,
      selectedObject.rotation.z,
    ];

    // 変形後の値でstateを更新する。
    setObjects((prev) =>
      prev.map((obj) =>
        obj.id === selectedId
          ? { ...obj, position: nextPosition, rotation: nextRotation }
          : obj
      )
    );
  };

  // 選択中のオブジェクトをstateから削除する。
  const deleteSelected = () => {
    if (!selectedId) return;
    setObjects((prev) => prev.filter((obj) => obj.id !== selectedId));
    setSelectedId(null);
  };

  return (
    <section className="page">
      <aside className="page__panel">
        <h2>R3F + drei</h2>
        <p>
          dreiのOrbitControls/TransformControlsを使うと、three.jsの便利機能をR3Fで
          すぐに利用できます。操作対象はReact stateで管理しつつ、変形はdreiに任せます。
        </p>
        <ul>
          <li>OrbitControlsで視点操作</li>
          <li>TransformControlsで移動/回転</li>
          <li>Transform後にstateへ同期</li>
        </ul>
        <div className="controls">
          <button
            className={mode === "translate" ? "primary" : ""}
            onClick={() => {
              // 移動モードに切り替える。
              setMode("translate");
            }}
          >
            移動モード
          </button>
          <button
            className={mode === "rotate" ? "primary" : ""}
            onClick={() => {
              // 回転モードに切り替える。
              setMode("rotate");
            }}
          >
            回転モード
          </button>
          <button onClick={deleteSelected}>選択を削除</button>
        </div>
        <p className="notice">選択中: {selectedName}</p>
      </aside>

      <div className="canvas-wrap">
        <Canvas
          camera={{ position: [6, 6, 10], fov: 50 }}
          onPointerMissed={() => {
            // 何もない場所をクリックしたら選択解除する。
            setSelectedId(null);
          }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 8, 3]} intensity={0.8} />
          <gridHelper args={[20, 20, "#3b3b3b", "#2a2a2a"]} />

          {objects.map((obj) => (
            <MeshItem
              key={obj.id}
              data={obj}
              selected={obj.id === selectedId}
              onSelect={setSelectedId}
              register={(id, mesh) => {
                // TransformControls用にメッシュ参照を保持する。
                meshMapRef.current[id] = mesh;
              }}
            />
          ))}

          {selectedObject && (
            <TransformControls
              object={selectedObject}
              mode={mode}
              onMouseDown={() => {
                // 変形操作中は視点操作を止める。
                setOrbitEnabled(false);
              }}
              onMouseUp={() => {
                // 変形操作が終わったら視点操作を再開する。
                setOrbitEnabled(true);
                syncSelectedToState();
              }}
              onChange={syncSelectedToState}
            />
          )}

          <OrbitControls enabled={orbitEnabled} />
        </Canvas>
      </div>
    </section>
  );
}
