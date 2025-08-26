import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./UploadPage.css";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [filename, setFilename] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef();
  const navigate = useNavigate();

  // 拖拽相关
  const [dragActive, setDragActive] = useState(false);

  // 拖拽事件
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragover" || e.type === "dragenter") setDragActive(true);
    if (e.type === "dragleave") setDragActive(false);
  };

  // 处理文件选择/拖拽
  const handleFile = (f) => {
    setError("");
    if (!f) return;
    // 文件类型与大小检查
    const allowed = [".csv", ".txt", ".json"];
    if (!allowed.some((ext) => f.name.endsWith(ext))) {
      setError("Only supports csv, txt, and json format files");
      return;
    }
    setFile(f);
    setFilename(f.name);
  };

  // 拖拽释放
  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // 点击上传
  const handleUploadClick = () => {
    fileInput.current.click();
  };

  // 选择文件
  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // 清空
  const handleCancel = () => {
    setFile(null);
    setFilename("");
    setError("");
  };

  // 上传
  const handleConfirm = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const resp = await fetch("http://localhost:8000/api/upload", {
        method: "POST",
        body: formData
      });
      const data = await resp.json();
      if (data.success) {
        // 保存 node_map 到 sessionStorage（要在跳转前！）
        if (data.node_map) {
          sessionStorage.setItem("node_map", JSON.stringify(data.node_map));
        }
        navigate(
          `/preview?edge_path=${encodeURIComponent(data.edge_path)}&filename=${encodeURIComponent(data.filename)}`
        );
      } else {
        setError(data.msg || "Upload failed");
      }
    } catch {
      setError("Upload error, please try again");
    }
    setUploading(false);
  };

  return (
    <div className="upload-bg">
      <div className="upload-card">
        <div className="upload-title">Upload Network File</div>
        <div
          className={`upload-dropzone${dragActive ? " drag-active" : ""}`}
          onClick={handleUploadClick}
          onDragOver={handleDrag}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          {filename ? (
            <span className="upload-filename">{filename}</span>
          ) : (
            <span className="upload-placeholder">
              Click or drag files here to upload<br />
              <span style={{fontSize: 15, color: "#888"}}>Support .csv, .txt, .json</span>
            </span>
          )}
          <input
            type="file"
            accept=".csv,.txt,.json"
            ref={fileInput}
            style={{display: "none"}}
            onChange={handleFileInput}
          />
        </div>
        {error && <div className="upload-error">{error}</div>}
        <div className="upload-btn-group">
          <button
            className="upload-btn"
            onClick={handleConfirm}
            disabled={!file || uploading}
          >
            Confirm
          </button>
          <button
            className="upload-btn upload-cancel"
            onClick={handleCancel}
            disabled={uploading || !file}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
