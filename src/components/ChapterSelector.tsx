import { useNavigate } from "react-router-dom";
import { chapters } from "../data/chapters";

// ドロップダウンでチャプターを選択するセレクター。
// ヘッダー部に配置し、どのチャプターからでも即座に移動できる。
type Props = { currentId: string };

export default function ChapterSelector({ currentId }: Props) {
  const navigate = useNavigate();

  return (
    <select
      className="chapter-selector"
      value={currentId}
      onChange={(e) => navigate(`/course/${e.target.value}`)}
    >
      {chapters.map((ch) => (
        <option key={ch.id} value={ch.id}>
          Ch.{ch.id} — {ch.title}
        </option>
      ))}
    </select>
  );
}
