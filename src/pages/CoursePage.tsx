import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ChapterPager from "../components/ChapterPager";
import ChapterSelector from "../components/ChapterSelector";
import MarkdownViewer from "../components/MarkdownViewer";
import { chapterIndex, chapters, loadChapterContent } from "../data/chapters";
import Playground from "./Playground";

export default function CoursePage() {
  const { chapter } = useParams<{ chapter: string }>();
  const navigate = useNavigate();
  const chapterId = chapter ?? "00";
  const idx = chapterIndex(chapterId);

  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [swapped, setSwapped] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [resizing, setResizing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef(false);

  const MIN_RATIO = 0.28;
  const MAX_RATIO = 0.72;

  const updateSplitRatio = (clientX: number) => {
    const body = bodyRef.current;
    if (!body) return;
    const rect = body.getBoundingClientRect();
    if (rect.width <= 0) return;

    const rawRatio = (clientX - rect.left) / rect.width;
    const clampedRatio = Math.min(MAX_RATIO, Math.max(MIN_RATIO, rawRatio));
    setSplitRatio(clampedRatio);
  };

  useEffect(() => {
    if (idx === -1) navigate("/", { replace: true });
  }, [idx, navigate]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadChapterContent(chapterId).then((md) => {
      if (cancelled) return;
      setContent(md ?? "");
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [chapterId]);

  if (idx === -1) return null;

  const currentChapter = chapters[idx];

  const materialPanel = (
    <div className="course__material" ref={scrollRef}>
      {loading ? (
        <div className="course__loading">読み込み中…</div>
      ) : (
        <>
          <ChapterPager currentId={chapterId} />
          <MarkdownViewer content={content} />
          <ChapterPager currentId={chapterId} />
        </>
      )}
    </div>
  );

  const implementPanel = (
    <div className="course__implement">
      <Playground />
    </div>
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    resizingRef.current = true;
    setResizing(true);
    document.body.style.userSelect = "none";
    e.currentTarget.setPointerCapture(e.pointerId);
    updateSplitRatio(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizingRef.current) return;
    updateSplitRatio(e.clientX);
  };

  const handlePointerUp = () => {
    resizingRef.current = false;
    setResizing(false);
    document.body.style.userSelect = "";
  };

  return (
    <div className="course">
      <div className="course__toolbar">
        <ChapterSelector currentId={chapterId} />
        <span className="course__chapter-title">
          Ch.{currentChapter.id} - {currentChapter.title}
        </span>
        <button
          className="course__swap-btn"
          onClick={() => setSwapped((s) => !s)}
          title="表示を入れ替え"
        >
          左右表示を入れ替え
        </button>
      </div>

      <div
        className="course__body"
        ref={bodyRef}
        style={{ gridTemplateColumns: `${splitRatio}fr 10px ${1 - splitRatio}fr` }}
      >
        {swapped ? (
          <>
            {implementPanel}
            <div
              className={`course__divider ${resizing ? "is-resizing" : ""}`}
              role="separator"
              aria-orientation="vertical"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onLostPointerCapture={handlePointerUp}
            />
            {materialPanel}
          </>
        ) : (
          <>
            {materialPanel}
            <div
              className={`course__divider ${resizing ? "is-resizing" : ""}`}
              role="separator"
              aria-orientation="vertical"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onLostPointerCapture={handlePointerUp}
            />
            {implementPanel}
          </>
        )}
      </div>
    </div>
  );
}
