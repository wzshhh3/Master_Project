import React, { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "./AnalyzePage.css";

const tasks = [
  { key: "subgraph", label: "Subgraph Enumeration" },
  { key: "gda", label: "Multi-network Comparison (GDA)" }
];

export default function AnalyzePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const edge_path = searchParams.get("edge_path");
  const filename = searchParams.get("filename");
  let node_map = {};
  try {
    node_map = JSON.parse(sessionStorage.getItem("node_map") || "{}");
  } catch { node_map = {}; }

  useEffect(() => {
    if (!edge_path || !filename) {
      setTimeout(() => navigate("/"), 1200);
    }
  }, [edge_path, filename, navigate]);

  const [task, setTask] = useState("subgraph");
  const [directed, setDirected] = useState(false);
  const [k, setK] = useState("");
  const [gtrieFile, setGtrieFile] = useState(null);
  const [gtrieFilePath, setGtrieFilePath] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const fileInput = useRef();

  // 参数校验
  const canStart = () => {
    if (!task) return false;
    if (!k || Number(k) < 3 || Number(k) > 5) return false;
    if (!gtrieFilePath) return false;
    return true;
  };

  // 上传 G-Trie
  const handleGtrieUpload = async (f) => {
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", f);
    try {
      const resp = await fetch("http://localhost:8000/api/upload_gtrie", {
        method: "POST",
        body: formData
      });
      const data = await resp.json();
      if (data.success) {
        setGtrieFile(f);
        setGtrieFilePath(data.gtrie_path);
      } else {
        setError(data.msg || "G-Trie file upload failed");
      }
    } catch {
      setError("Network error, failed to upload G-Trie file");
    }
    setUploading(false);
  };

  const handleGtrieFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleGtrieUpload(e.target.files[0]);
    }
  };

  // 生成 G-Trie 文件
  const handleGenerate = () => {
    navigate(
      `/generate-gtrie?mode=gtrie&k=${encodeURIComponent(k)}&directed=${directed}`
    );
  };

  // 启动分析
  const handleStart = () => {
  if (task === "gda") {
    // 跳转到上传第二网络页面，并把本次参数通过 URL 带过去
    navigate(
      `/upload-second-network?edge_path=${encodeURIComponent(edge_path)}&filename=${encodeURIComponent(filename)}&k=${encodeURIComponent(k)}&directed=${directed}&gtrie_path=${encodeURIComponent(gtrieFilePath)}`
    );
  } else {
    // 单网络分析走原流程
    navigate(
      `/analyzeresult?edge_path=${encodeURIComponent(edge_path)}&filename=${encodeURIComponent(filename)}&k=${encodeURIComponent(k)}&directed=${directed}&task=${encodeURIComponent(task)}&gtrie_path=${encodeURIComponent(gtrieFilePath)}`
    );
  }
};

  if (!edge_path || !filename) {
    return <div style={{color: "red", margin: 40}}>Missing parameters, returned to upload page.</div>;
  }

  return (
    <div className="analyze-bg">
      <div className="analyze-card">
        <div className="analyze-section">
          <div className="analyze-title">Select Task：</div>
          {tasks.map(t => (
            <label key={t.key} className="radio-label">
              <input
                type="radio"
                name="task"
                value={t.key}
                checked={task === t.key}
                onChange={() => setTask(t.key)}
              />
              {t.label}
            </label>
          ))}
        </div>
        <div className="analyze-section">
          <div className="analyze-title">Parameter setting：</div>
          <label className="radio-label">
            <input type="radio" name="directed" checked={directed} onChange={() => setDirected(true)} />
            Directed
          </label>
          <label className="radio-label">
            <input type="radio" name="directed" checked={!directed} onChange={() => setDirected(false)} />
            Undirected
          </label>
          <div style={{marginTop: 8}}>
            Subgraph Size k:
            <input
              type="number"
              value={k}
              min={3}
              max={4}
              onChange={e => setK(e.target.value)}
              className="k-input"
              style={{width: "46px", marginLeft: 8}}
            />
            <span style={{marginLeft: 6, fontSize: 14, color: "#999"}}>(3-4)</span>
          </div>
        </div>
        <div className="analyze-section">
          <div className="analyze-title" style={{marginBottom: 4}}>G-Trie file：</div>
          <button
            className="analyze-btn"
            onClick={() => fileInput.current.click()}
            disabled={uploading}
            style={{marginRight: 18}}
          >Upload</button>
          <input
            type="file"
            accept=".gt,.gtrie"
            ref={fileInput}
            style={{display: "none"}}
            onChange={handleGtrieFileInput}
          />
          <button
            className="analyze-btn"
            onClick={handleGenerate}
            style={{marginRight: 20}}
          >Generate</button>
          <span style={{fontSize: 13, color: "#314df7"}}>
            {gtrieFile && `Selected: ${gtrieFile.name}`}
          </span>
        </div>
        {error && <div className="analyze-error">{error}</div>}
        <div className="analyze-section" style={{marginTop: 24, textAlign: "right"}}>
          <button
            className="analyze-btn main"
            disabled={!canStart() || uploading}
            onClick={handleStart}
          >Start Analysis</button>
        </div>
      </div>
    </div>
  );
}
