// 全チャプターのメタ情報を定義し、マークダウンの動的ロードを提供する。

export interface Chapter {
  /** URL パラメータに使う番号文字列（"00" ~ "06"） */
  id: string;
  /** 表示用タイトル */
  title: string;
  /** ファイル名（docs/course/ 直下） */
  filename: string;
}

export const chapters: Chapter[] = [
  { id: "00", title: "環境確認（責務の整理）", filename: "00_environment.md" },
  { id: "01", title: "R3Fで最小シーンを作る", filename: "01_min_scene.md" },
  { id: "02", title: "選択機能", filename: "02_selection.md" },
  { id: "03", title: "回転・削除", filename: "03_rotate_delete.md" },
  { id: "04", title: "drei導入（カメラ・ドラッグ）", filename: "04_drei.md" },
  { id: "05", title: "モデル読み込み（useGLTF）", filename: "05_gltf_loader.md" },
  { id: "06", title: "three.js単体との比較", filename: "06_threejs_comparison.md" },
];

// Vite の import.meta.glob で docs/course/*.md をテキストとして遅延ロード
const mdModules = import.meta.glob<string>("../../docs/course/*.md", {
  query: "?raw",
  import: "default",
});

/**
 * チャプター ID（"00" 等）からマークダウン文字列を非同期で返す。
 * 存在しない ID を渡した場合は undefined を返す。
 */
export async function loadChapterContent(
  chapterId: string,
): Promise<string | undefined> {
  const chapter = chapters.find((c) => c.id === chapterId);
  if (!chapter) return undefined;

  // glob のキーは相対パス形式（例: "../../docs/course/00_environment.md"）
  const key = Object.keys(mdModules).find((k) =>
    k.endsWith(`/${chapter.filename}`),
  );
  if (!key) return undefined;

  return mdModules[key]();
}

/** チャプター ID からインデックスを返す */
export function chapterIndex(id: string): number {
  return chapters.findIndex((c) => c.id === id);
}
