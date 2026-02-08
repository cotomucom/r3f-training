import { useState } from "react";
import ThreeVanilla from "./ThreeVanilla";
import R3FCore from "./R3FCore";
import R3FDrei from "./R3FDrei";

type Tab = "vanilla" | "r3f" | "drei";

// タブで three.js / R3F / R3F+drei の実装を切り替えて比較できるページ
export default function ComparisonPages() {
  const [activeTab, setActiveTab] = useState<Tab>("vanilla");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "12px 16px",
          borderBottom: "1px solid #e0e0e0",
          backgroundColor: "#fafafa",
        }}
      >
        <button
          onClick={() => setActiveTab("vanilla")}
          style={{
            padding: "8px 16px",
            border: "1px solid #ddd",
            borderRadius: 4,
            backgroundColor: activeTab === "vanilla" ? "#4a90e2" : "#fff",
            color: activeTab === "vanilla" ? "#fff" : "#333",
            fontWeight: activeTab === "vanilla" ? 600 : 400,
            cursor: "pointer",
          }}
        >
          three.js 単体
        </button>
        <button
          onClick={() => setActiveTab("r3f")}
          style={{
            padding: "8px 16px",
            border: "1px solid #ddd",
            borderRadius: 4,
            backgroundColor: activeTab === "r3f" ? "#4a90e2" : "#fff",
            color: activeTab === "r3f" ? "#fff" : "#333",
            fontWeight: activeTab === "r3f" ? 600 : 400,
            cursor: "pointer",
          }}
        >
          R3F
        </button>
        <button
          onClick={() => setActiveTab("drei")}
          style={{
            padding: "8px 16px",
            border: "1px solid #ddd",
            borderRadius: 4,
            backgroundColor: activeTab === "drei" ? "#4a90e2" : "#fff",
            color: activeTab === "drei" ? "#fff" : "#333",
            fontWeight: activeTab === "drei" ? 600 : 400,
            cursor: "pointer",
          }}
        >
          R3F + drei
        </button>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {activeTab === "vanilla" && <ThreeVanilla />}
        {activeTab === "r3f" && <R3FCore />}
        {activeTab === "drei" && <R3FDrei />}
      </div>
    </div>
  );
}
