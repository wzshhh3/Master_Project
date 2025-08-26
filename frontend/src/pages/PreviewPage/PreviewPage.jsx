import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import CytoscapeComponent from "react-cytoscapejs";
import "./PreviewPage.css";

export default function PreviewPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const edge_path = searchParams.get("edge_path");
  const filename  = searchParams.get("filename");

  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // 用于强制重建 Cytoscape 组件
  const [cyKey, setCyKey] = useState(0);

  useEffect(() => {
    if (!edge_path || !filename) {
      setError("Missing parameters, returning to upload page");
      const t = setTimeout(() => navigate("/"), 1200);
      return () => clearTimeout(t);
    }
    setLoading(true);
    fetch(`http://localhost:8000/api/preview_info?edge_path=${encodeURIComponent(edge_path)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setInfo(data);
        } else {
          setError(data.msg || "Loading failed");
        }
      })
      .catch(() => setError("Network Error"))
      .finally(() => setLoading(false));
  }, [edge_path, filename, navigate]);

  const elements = useMemo(() => {
    if (!info) return [];
    const nodes = (info.nodes || []).map(n => ({ data: { id: String(n), label: String(n) } }));
    const edges = (info.edges || []).map(([s, t]) => ({ data: { source: String(s), target: String(t) } }));
    return [...nodes, ...edges];
  }, [info]);

  // 每次元素准备好后，强制“整组件重建”，避免内部状态脏引用
  useEffect(() => {
    if (elements.length > 0) {
      // 下一帧再重建，确保元素已挂好
      const id = requestAnimationFrame(() => setCyKey(k => k + 1));
      return () => cancelAnimationFrame(id);
    }
  }, [elements.length]);

  const stylesheet = [
    {
      selector: "node",
      style: {
        "background-color": "#f9fafc",
        "border-width": 2,
        "border-color": "#3366cc",
        "label": "data(label)",
        "color": "#193189",
        "font-size": 16,
        "text-valign": "center",
        "text-halign": "center",
        "width": 38,
        "height": 38,
        "text-outline-color": "#fff",
        "text-outline-width": 2
      }
    },
    {
      selector: "edge",
      style: {
        "width": 2.5,
        "line-color": "#a0b6e6",
        "curve-style": "bezier",
        "target-arrow-shape": "triangle",
        "target-arrow-color": "#a0b6e6",
        "arrow-scale": 1,
        "opacity": 0.92
      }
    }
  ];

  const handleConfirm = () => {
    navigate(`/analyze?edge_path=${encodeURIComponent(edge_path)}&filename=${encodeURIComponent(filename)}`);
  };

  return (
    <div className="preview-bg">
      <div className="preview-card">
        <div className="preview-header">
          <div>File name: <b>{filename}</b></div>
          <div style={{ marginTop: 6 }}>
            Nodes: <b>{info ? info.node_count : "--"}</b>&emsp;
            Edges: <b>{info ? info.edge_count : "--"}</b>
          </div>
        </div>

        <div className="preview-center">
          <div className="preview-cyto-box">
            {loading && <div className="preview-loading">Loading graph…</div>}

            {!loading && elements.length > 0 && (
              <CytoscapeComponent
                key={cyKey}                       // ← 每次数据来都“换一个新组件”
                elements={elements}
                layout={{ name: "cose", animate: false }} // 交给 cytoscape 自己布局
                stylesheet={stylesheet}
                style={{
                  width: "720px",
                  height: "460px",
                  background: "#fff",
                  borderRadius: "10px",
                  border: "1.5px dashed #a1b6e7",
                  boxShadow: "0 2px 12px rgba(90,110,180,0.08)"
                }}
              />
            )}

            {!loading && elements.length === 0 && (
              <div className="preview-empty">No graph elements to display</div>
            )}
          </div>
        </div>

        {error && <div className="preview-error">{error}</div>}

        <div className="preview-btn-group">
          <button className="preview-btn" onClick={handleConfirm} disabled={!info}>
            Confirm
          </button>
          <button className="preview-btn preview-cancel" onClick={() => navigate("/")}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
