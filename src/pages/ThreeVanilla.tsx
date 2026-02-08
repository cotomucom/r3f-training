// THREE: three.js本体。Scene/Camera/Rendererなどの基本クラスを提供する。
// OrbitControls: 視点をマウスで回すための操作ユーティリティ。
// TransformControls: 選択したオブジェクトをドラッグで移動/回転させる操作ユーティリティ。
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";

// three.jsを素のAPIで書いた例。
// Reactの中でthree.jsを動かすため、useEffectで初期化し、unmount時に後片付けする。
// three.js基礎ページのReactコンポーネント。
export default function ThreeVanilla() {
  // three.jsの描画DOMを差し込む先を保持するための参照。
  const containerRef = useRef<HTMLDivElement | null>(null);
  // TransformControls本体を保持する参照。
  const transformRef = useRef<TransformControls | null>(null);
  // TransformControlsの見た目(ヘルパー)を保持する参照。
  const transformHelperRef = useRef<THREE.Object3D | null>(null);
  // 現在選択しているオブジェクトを保持する参照。
  const selectedRef = useRef<THREE.Object3D | null>(null);
  // シーン上のオブジェクト一覧を保持する参照（削除で使う）。
  const objectsRef = useRef<THREE.Mesh[]>([]);
  // 変形操作中かどうかのフラグ（クリック選択と競合しないため）。
  const isTransformingRef = useRef(false);

  // TransformControlsのモードをUIで切り替えるためのstate。
  const [mode, setMode] = useState<"translate" | "rotate">("translate");
  // 画面に表示する「選択中の名前」を管理するstate。
  const [selectedName, setSelectedName] = useState<string | null>(null);

  // three.jsの初期化と破棄を1回だけ行う。
  useEffect(() => {
    // 描画先DOMが無い場合は何もしない。
    const container = containerRef.current;
    if (!container) return;

    // 1) Scene: 3D空間そのもの。
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0f0f12");

    // 2) Camera: 3D空間を見るための視点。
    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(6, 6, 10);

    // 3) Renderer: 3D空間を2Dの画面に描画する。
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    // タッチ操作がある環境でもドラッグが安定するように設定。
    renderer.domElement.style.touchAction = "none";
    container.appendChild(renderer.domElement);

    // 4) ライト: 物体を見えるようにする。
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 8, 3);
    scene.add(ambient, directional);

    // 5) 床グリッド: 空間のサイズ感を把握しやすくする。
    const grid = new THREE.GridHelper(20, 20, "#3b3b3b", "#2a2a2a");
    scene.add(grid);

    // 6) オブジェクト配置: 最初は配列で管理しておくと削除が楽。
    const meshes: THREE.Mesh[] = [];
    // 立方体を作ってシーンに追加する小さな関数。
    const createBox = (name: string, color: string, x: number) => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({ color });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, 0.5, 0);
      mesh.name = name;
      scene.add(mesh);
      meshes.push(mesh);
    };

    createBox("Cube A", "#ff8c61", -2);
    createBox("Cube B", "#5fa8ff", 0);
    createBox("Cube C", "#f9d65c", 2);

    objectsRef.current = meshes;

    // 7) OrbitControls: カメラを回して全体を見渡せるようにする。
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;

    // 8) TransformControls: 選択したオブジェクトをドラッグで動かす・回す。
    const transform = new TransformControls(camera, renderer.domElement);
    transform.setMode(mode);
    const transformHelper = transform.getHelper();
    transformHelper.visible = false;
    transform.addEventListener("dragging-changed", (event) => {
      // event.value をbooleanとして扱う。
      const isDragging = (event as { value: boolean }).value;
      // 変形操作中はOrbitControlsを止めないと操作が競合する。
      orbit.enabled = !isDragging;
      isTransformingRef.current = isDragging;
    });
    scene.add(transformHelper);
    transformRef.current = transform;
    transformHelperRef.current = transformHelper;

    // 9) Raycaster: クリック位置から光線を飛ばして物体を選択する。
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    // 選択状態を更新し、見た目とTransformControlsを同期する。
    const setSelected = (object: THREE.Object3D | null) => {
      // 以前の選択を見た目でリセットする。
      const prev = selectedRef.current;
      if (prev && prev instanceof THREE.Mesh) {
        const material = prev.material;
        if (Array.isArray(material)) {
          material.forEach((mat) => mat.emissive?.set("#000000"));
        } else {
          material.emissive?.set("#000000");
        }
      }

      // 今の選択を保存して、UI表示も更新する。
      selectedRef.current = object;
      setSelectedName(object?.name ?? null);

      // 新しく選択したオブジェクトは見た目を強調する。
      if (object && object instanceof THREE.Mesh) {
        const material = object.material;
        if (Array.isArray(material)) {
          material.forEach((mat) => mat.emissive?.set("#222222"));
        } else {
          material.emissive?.set("#222222");
        }
      }

      // TransformControlsを選択対象に追従させる。
      if (transformRef.current) {
        if (object) {
          transformRef.current.attach(object);
          if (transformHelperRef.current) {
            transformHelperRef.current.visible = true;
          }
        } else {
          transformRef.current.detach();
          if (transformHelperRef.current) {
            transformHelperRef.current.visible = false;
          }
        }
      }
    };

    // クリック位置からRayを飛ばして、当たったオブジェクトを選択する。
    const onPointerDown = (event: PointerEvent) => {
      // TransformControlsを掴んでいる最中は、選択処理を上書きしない。
      if (isTransformingRef.current) return;

      // クリック座標を正規化してRaycasterへ渡す。
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      // 交差したオブジェクトがあれば最初のものを選択する。
      const hits = raycaster.intersectObjects(meshes, false);
      if (hits.length > 0) {
        setSelected(hits[0].object);
      } else {
        // 何もクリックしていない場合は選択解除する。
        setSelected(null);
      }
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);

    let frameId = 0;
    // 毎フレーム描画するためのループ関数。
    const animate = () => {
      orbit.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    // 画面サイズ変更に合わせてカメラと描画サイズを更新する。
    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener("resize", onResize);

    return () => {
      // Reactで破棄するときは、イベント解除とリソース解放を忘れない。
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      cancelAnimationFrame(frameId);
      transform.dispose();
      orbit.dispose();
      transformHelper.removeFromParent();
      transformHelperRef.current = null;

      meshes.forEach((mesh) => {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => mat.dispose());
        } else {
          mesh.material.dispose();
        }
      });

      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  // UIでモードを変えたとき、TransformControlsへ反映する。
  useEffect(() => {
    if (transformRef.current) {
      transformRef.current.setMode(mode);
    }
  }, [mode]);

  // 選択中のオブジェクトをシーンから削除する。
  const handleDelete = () => {
    const selected = selectedRef.current;
    if (!selected) return;

    // three.jsは「見た目」と「存在」を自分で管理する必要がある。
    selected.parent?.remove(selected);

    if (selected instanceof THREE.Mesh) {
      selected.geometry.dispose();
      if (Array.isArray(selected.material)) {
        selected.material.forEach((mat) => mat.dispose());
      } else {
        selected.material.dispose();
      }
    }

    objectsRef.current = objectsRef.current.filter((obj) => obj !== selected);
    selectedRef.current = null;
    setSelectedName(null);

    if (transformRef.current) {
      transformRef.current.detach();
      if (transformHelperRef.current) {
        transformHelperRef.current.visible = false;
      }
    }
  };

  return (
    <section className="page">
      <aside className="page__panel">
        <h2>three.js基礎</h2>
        <p>
          Reactとは独立したthree.jsの書き方を確認します。ここでは「scene / camera /
          renderer」を手で組み立て、選択やドラッグを実装します。
        </p>
        <ul>
          <li>クリックでオブジェクト選択</li>
          <li>TransformControlsで移動/回転</li>
          <li>削除でシーンから取り除く</li>
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
          <button
            onClick={() => {
              // 選択中のオブジェクトを削除する。
              handleDelete();
            }}
          >
            選択を削除
          </button>
        </div>
        <p className="notice">選択中: {selectedName ?? "なし"}</p>
      </aside>

      <div className="canvas-wrap" ref={containerRef} />
    </section>
  );
}
