import { Link } from "react-router-dom";
import { chapters } from "../data/chapters";

// トップページ: 学習の入り口を示す。各チャプターへのリンク付き。
export default function CourseHome() {
  return (
    <section className="home">
      <div className="page__panel">
        <div className="home__split">
          <section className="home__block">
            <h2>ハンズオン演習</h2>
            <p>
              この教材では R3F core と three.js の基礎を段階的に学ぶことができます。<br />
              実際にコードを書きながら教材を読み進めましょう。ブラウザ上でリアルタイムに動作を確認しながら学べます。
            </p>
            <div className="controls" style={{ marginTop: 16 }}>
              <Link to="/course/00" className="primary">
                教材を読み始める
              </Link>
            </div>

            <ol className="chapter-list">
              {chapters.map((ch) => (
                <li key={ch.id}>
                  <Link to={`/course/${ch.id}`} className="chapter-list__link">
                    <span className="chapter-list__num">Ch.{ch.id}</span>
                    <span className="chapter-list__title">{ch.title}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          <section className="home__block">
            <h2>ライブラリ実装比較</h2>
            <p>
              同じ機能を three.js 単体、R3F、R3F + drei
              でそれぞれ実装した場合のコード比較ができます。
              抽象化のレベルがどう違うか、実際に動かしながら比較してみましょう。
            </p>
            <div className="controls" style={{ marginTop: 16 }}>
              <Link to="/comparison">比較ページを開く</Link>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
