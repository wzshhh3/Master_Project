import React, { useRef, useState } from "react";
import { useNavigate,useSearchParams } from "react-router-dom";
import "./UploadSecondNetworkPage.css";  // 和主上传页面共用同一份CSS

export default function UploadSecondNetworkPage() {
  // 用 useSearchParams 读取之前页面传来的所有参数
  const [searchParams] = useSearchParams();
  const paramsObj = Object.fromEntries(searchParams.entries());

  // 文件和上传逻辑
  const [file, setFile] = useState(null);
  const [filename, setFilename] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef();

  // 拖拽高亮
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

  // 上传并携带全部参数到 gdaresult
  const navigate = useNavigate();
  const handleConfirm = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const resp = await fetch("http://localhost:8000/api/upload_second_network", {
        method: "POST",
        body: formData
      });
      const data = await resp.json();
      if (data.success) {
        // 保存第二网络节点映射（如有）
        if (data.node_map) {
          sessionStorage.setItem("node_map2", JSON.stringify(data.node_map));
        }
        // 合并全部参数（原有 + 第二网络）
        const fullParams = {
          ...paramsObj,
          edge_path2: data.edge_path,
          filename2: data.filename
        };
        navigate(`/gdaresult?${new URLSearchParams(fullParams).toString()}`);
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
        <div className="upload-title">Upload Second Network File</div>
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