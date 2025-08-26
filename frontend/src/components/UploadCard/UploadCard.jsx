import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./UploadPage.css";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const fileInput = useRef(null);
  const navigate = useNavigate();

  const allowedSuffix = ["txt", "csv", "json"];

  // 文件本地校验
  const validateFile = async (file) => {
    const suffix = file.name.split(".").pop().toLowerCase();
    if (!allowedSuffix.includes(suffix)) {
      setError("仅支持txt, csv, json格式");
      return false;
    }
    setError("");
    return true;
  };

  const handleFileChange = async (f) => {
    if (!f) return;
    const valid = await validateFile(f);
    if (valid) setFile(f);
    else setFile(null);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleInput = async (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileChange(e.target.files[0]);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setError("");
    if (fileInput.current) fileInput.current.value = "";
  };

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
        navigate("/preview", { state: { filename: data.filename, nodeMap: data.node_map } });
      } else {
        setError(data.msg || "上传失败");
      }
    } catch {
      setError("上传出错，请重试");
    }
    setUploading(false);
  };

  return (
    <div className="upload-page-bg">
      <div
        className="upload-box"
        onClick={() => fileInput.current && fileInput.current.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInput}
          style={{ display: "none" }}
          accept=".txt,.csv,.json"
          onChange={handleInput}
        />
        <div className="upload-box-content">
          {file ? (
            <span>
              已选择: {file.name}
            </span>
          ) : (
            <span className="upload-tip">点击或拖拽文件到此上传</span>
          )}
        </div>
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
          disabled={!file}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
