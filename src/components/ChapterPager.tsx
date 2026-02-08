import { useNavigate } from "react-router-dom";
import { chapters, chapterIndex } from "../data/chapters";

// チャプター前後移動ボタン。教材の上部と下部に配置する。
// 最初の章では「前へ」を非表示、最後の章では「次へ」を非表示にする。
type Props = { currentId: string };

export default function ChapterPager({ currentId }: Props) {
  const navigate = useNavigate();
  const idx = chapterIndex(currentId);
  const prev = idx > 0 ? chapters[idx - 1] : null;
  const next = idx < chapters.length - 1 ? chapters[idx + 1] : null;

  return (
    <nav className="chapter-pager">
      {prev ? (
        <button
          className="chapter-pager__btn chapter-pager__btn--prev"
          onClick={() => navigate(`/course/${prev.id}`)}
        >
          <span className="chapter-pager__arrow">←</span>
          <span className="chapter-pager__label">
            <span className="chapter-pager__dir">前のチャプター</span>
            <span className="chapter-pager__title">
              Ch.{prev.id} {prev.title}
            </span>
          </span>
        </button>
      ) : (
        <span />
      )}
      {next ? (
        <button
          className="chapter-pager__btn chapter-pager__btn--next"
          onClick={() => navigate(`/course/${next.id}`)}
        >
          <span className="chapter-pager__label">
            <span className="chapter-pager__dir">次のチャプター</span>
            <span className="chapter-pager__title">
              Ch.{next.id} {next.title}
            </span>
          </span>
          <span className="chapter-pager__arrow">→</span>
        </button>
      ) : (
        <span />
      )}
    </nav>
  );
}
