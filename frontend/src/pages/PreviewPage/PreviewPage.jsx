import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import CytoscapeComponent from "react-cytoscapejs";
import "./PreviewPage.css";
import ErrorBoundary from "./ErrorBoundary";

export default function PreviewPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const edge_path = searchParams.get("edge_path");
  const filename = searchParams.get("filename");

  let node_map = {};
  try {
    node_map = JSON.parse(sessionStorage.getItem("node_map") || "{}");
  } catch {
    node_map = {};
  }

  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!edge_path || !filename) {
      setError("Missing parameters, returning to upload page");
      setTimeout(() => navigate("/"), 1200);
      return;
    }

    fetch(
      `http://localhost:8000/api/preview_info?edge_path=${encodeURIComponent(
        edge_path
      )}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setInfo(data);
        else setError(data.msg || "Loading failed");
      })
      .catch(() => setError("Network Error"));
  }, [edge_path, filename, navigate]);

  const elements = info
    ? [
        ...info.nodes.map((node) => ({
          data: { id: node, label: node },
        })),
        ...info.edges.map(([source, target]) => ({
          data: { source, target },
        })),
      ]
    : [];

  // Directed + Arrow样式
  const style = [
    {
      selector: "node",
      style: {
        "background-color": "#f9fafc",
        "border-width": 2,
        "border-color": "#3366cc",
        label: "data(label)",
        color: "#193189",
        "font-size": 16,
        "text-valign": "center",
        "text-halign": "center",
        width: 38,
        height: 38,
        "text-outline-color": "#fff",
        "text-outline-width": 2,
      },
    },
    {
      selector: "edge",
      style: {
        width: 2.5,
        "line-color": "#a0b6e6",
        "curve-style": "bezier",
        "target-arrow-shape": "triangle", // 有向箭头
        "target-arrow-color": "#a0b6e6",
        "arrow-scale": 1,
        opacity: 0.92,
      },
    },
  ];

  // 使用cose作为力导向布局
  const layout = { name: "cose", animate: true, fit: true, padding: 30 };

  const handleConfirm = () => {
    navigate(
      `/analyze?edge_path=${encodeURIComponent(
        edge_path
      )}&filename=${encodeURIComponent(filename)}`
    );
  };

  return (
    <div className="preview-bg">
      <div className="preview-card">
        <div className="preview-header">
          <div>
            File name: <b>{filename}</b>
          </div>
          <div style={{ marginTop: 6 }}>
            Nodes: <b>{info ? info.node_count : "--"}</b>  Edges:{" "}
            <b>{info ? info.edge_count : "--"}</b>
          </div>
        </div>

        <div className="preview-center">
          <div className="preview-cyto-box">
            {info && (
              <ErrorBoundary>
                <CytoscapeComponent
                  elements={elements}
                  style={{
                    width: "600px",
                    height: "400px",
                    background: "#fff",
                    borderRadius: "10px",
                    border: "1.5px dashed #a1b6e7",
                    boxShadow: "0 2px 12px rgba(90,110,180,0.08)",
                  }}
                  stylesheet={style}
                  layout={{ name: "cose" }}
                />
              </ErrorBoundary>
            )}
          </div>
        </div>

        {error && <div className="preview-error">{error}</div>}

        <div className="preview-btn-group">
          <button
            className="preview-btn"
            onClick={handleConfirm}
            disabled={!info}
          >
            Confirm
          </button>
          <button
            className="preview-btn preview-cancel"
            onClick={() => navigate("/")}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
