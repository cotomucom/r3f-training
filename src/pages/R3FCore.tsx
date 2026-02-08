import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useState } from "react";
import * as THREE from "three";

// 学習用のデータモデル: Reactのstateで3Dオブジェクトを管理する。
export type SceneObject = {
  id: string;
  name: string;
  color: string;
  position: [number, number, number];
  rotation: [number, number, number];
};

type DraggableBoxProps = {
  data: SceneObject;
  selected: boolean;
  dragging: boolean;
  onSelect: (id: string) => void;
  onDrag: (id: string, nextPosition: [number, number, number]) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
};

// 1つの立方体を描画し、ドラッグに反応する小さな部品。
function DraggableBox({
  data,
  selected,
  dragging,
  onSelect,
  onDrag,
  onDragStart,
  onDragEnd,
}: DraggableBoxProps) {
  const { camera, raycaster, pointer } = useThree();

  // y=0 の床と交差する位置を求め、ドラッグ先を決める。
  const dragPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    [],
  );
  const hitPoint = useMemo(() => new THREE.Vector3(), []);

  // 毎フレーム、ドラッグ中なら床との交点を計算して位置を更新する。
  useFrame(() => {
    if (!dragging) return;
    if (!selected) return;

    // pointer はR3Fが更新してくれるので、そこからRayを作る。
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(dragPlane, hitPoint)) {
      onDrag(data.id, [hitPoint.x, 0.5, hitPoint.z]);
    }
  });

  return (
    <mesh
      position={data.position}
      rotation={data.rotation}
      onPointerDown={(event) => {
        // クリックで選択し、ドラッグ開始のフラグを立てる。
        event.stopPropagation();
        onSelect(data.id);
        onDragStart(data.id);
      }}
      onPointerUp={(event) => {
        // ドラッグ終了時にフラグを下ろす。
        event.stopPropagation();
        onDragEnd();
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

// R3Fの「コアだけ」で操作を実装したページ。
export default function R3FCore() {
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const selectedObject = objects.find((obj) => obj.id === selectedId) ?? null;

  // ドラッグで移動したいときに、対象の座標だけ更新する。
  const handleDrag = (id: string, nextPosition: [number, number, number]) => {
    setObjects((prev) =>
      prev.map((obj) =>
        obj.id === id ? { ...obj, position: nextPosition } : obj,
      ),
    );
  };

  // 選択中のオブジェクトを少しだけ回転させる。
  const rotateSelected = () => {
    if (!selectedId) return;
    setObjects((prev) =>
      prev.map((obj) =>
        obj.id === selectedId
          ? {
              ...obj,
              rotation: [
                obj.rotation[0],
                obj.rotation[1] + Math.PI / 6,
                obj.rotation[2],
              ],
            }
          : obj,
      ),
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
        <h2>R3Fコア</h2>
        <p>
          Reactのstateで3Dオブジェクトを管理する例です。R3Fはthree.jsをReact
          コンポーネントとして扱えるので、配置や削除が直感的になります。
        </p>
        <ul>
          <li>stateがシーンの「正解データ」になる</li>
          <li>ドラッグはRayと床の交差で座標を求める</li>
          <li>回転はstate更新で行う</li>
        </ul>
        <div className="controls">
          <button className="primary" onClick={rotateSelected}>
            選択を回転 (+30°)
          </button>
          <button onClick={deleteSelected}>選択を削除</button>
        </div>
        <p className="notice">選択中: {selectedObject?.name ?? "なし"}</p>
      </aside>

      <div className="canvas-wrap">
        <Canvas
          camera={{ position: [6, 6, 10], fov: 50 }}
          onPointerMissed={() => {
            // 何もない場所をクリックしたら選択を解除する。
            setSelectedId(null);
            setDraggingId(null);
          }}
          onPointerUp={() => {
            // マウスを離したらドラッグ終了扱いにする。
            setDraggingId(null);
          }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 8, 3]} intensity={0.8} />
          <gridHelper args={[20, 20, "#3b3b3b", "#2a2a2a"]} />

          {objects.map((obj) => (
            <DraggableBox
              key={obj.id}
              data={obj}
              selected={obj.id === selectedId}
              dragging={obj.id === draggingId}
              onSelect={setSelectedId}
              onDragStart={(id) => {
                // ドラッグ対象のIDを記録する。
                setDraggingId(id);
              }}
              onDragEnd={() => {
                // ドラッグ終了でIDを消す。
                setDraggingId(null);
              }}
              onDrag={handleDrag}
            />
          ))}
        </Canvas>
      </div>
    </section>
  );
}
