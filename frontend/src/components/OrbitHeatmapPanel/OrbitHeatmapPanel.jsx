// src/components/OrbitHeatmapPanel.jsx
import React from "react";
import "./OrbitHeatmapPanel.css";

export default function OrbitHeatmapPanel({ heatmapUrl, gddDistribution = {}, selectedNode,K }) {
  // 导出 GDD 文本
  const exportGDD = () => {
    let txt = "";
    Object.entries(gddDistribution).forEach(([orbit, dist]) => {
      const pairs = Object.entries(dist)
        .map(([deg, cnt]) => `${deg}:${cnt}`)
        .join(",");
      txt += `${orbit}-${pairs}\n`;
    });
    const blob = new Blob([txt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gdd_distribution.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="orbit-panel">
      <div className="heatmap-section">
        {heatmapUrl ? (
          <img src={`http://localhost:8000${heatmapUrl}`} alt="Orbit Heatmap" className="heatmap-img" />
        ) : (
          <div className="heatmap-placeholder">No Heatmap</div>
        )}
        <button className="export-btn" onClick={() => window.open(`http://localhost:8000${heatmapUrl}`, "_blank")}>
          Export
        </button>
      </div>

      <div className="gdd-section">
        <table className="gdd-table">
          <thead>
            <tr>
              <th>Orbit</th>
              <th>Distribution</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(gddDistribution).map(([orbit, dist]) => (
              <tr
                key={orbit}
                className={orbit === selectedNode ? "selected" : ""}
              >
                <td>{orbit}</td>
                <td>{JSON.stringify(dist)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="export-btn" onClick={exportGDD}>
          Export
        </button>
      </div>
      <div className="orbit-action">
    <button
      className="back-btn"
      onClick={() => window.location.href='http://localhost:3000/upload'}  // 或用你的路由跳转逻辑
    >
      Return to upload page
    </button>
  </div>
    </div>
  );
}
