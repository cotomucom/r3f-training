import { NavLink, Route, Routes } from "react-router-dom";
import CourseHome from "./pages/CourseHome";
import ComparisonPages from "./pages/ComparisonPages";
import CoursePage from "./pages/CoursePage";

// ルーティングを1か所に集約。学習トップ、実装用ワークスペース、比較ページを提供。
export default function App() {
  return (
    <div className="app">
      <header className="app__header">
        <h1>three.js / R3F 学習コース</h1>
        <p className="app__subtitle">
          実際に手を動かしながらR3Fを学ぶプロジェクトです。
        </p>
        <nav className="app__nav">
          <NavLink to="/">トップ</NavLink>
          <NavLink to="/course/00">教材を読む</NavLink>
          <NavLink to="/comparison">ライブラリ比較</NavLink>
        </nav>
      </header>

      <main className="app__main">
        <Routes>
          <Route path="/" element={<CourseHome />} />
          <Route path="/course/:chapter" element={<CoursePage />} />
          <Route path="/comparison" element={<ComparisonPages />} />
        </Routes>
      </main>
    </div>
  );
}
