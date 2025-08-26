import React, { useState, useRef } from "react";
import "./GenerateGtriePage.css";

export default function GenerateGtriePage() {
  const [k, setK] = useState("");
  const [directed, setDirected] = useState(false);
  const [method, setMethod] = useState("all"); // "all" or "upload"
  const [orbit, setOrbit] = useState(false);
  const [fileName, setFileName] = useState("mygraphlet.gt");
  const [uploadList, setUploadList] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const uploadRef = useRef();

  // 文件选择/校验
  const handleUpload = (e) => {
    setUploadError("");
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      if (!f.name.endsWith(".txt")) {
        setUploadError("Only supports encoding list files in txt format");
        setUploadList(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target.result.trim();
        if (!/^[01\n\r]+$/.test(content)) {
          setUploadError("The encoded file can only contain 0/1 characters");
          setUploadList(null);
          return;
        }
        const lines = content.split(/\r?\n/);
        if (k && lines.some(line => line && line.length !== k * k)) {
          setUploadError(`Each line should be of length ${k * k}（k=${k}）`);
          setUploadList(null);
          return;
        }
        setUploadList(f);
      };
      reader.readAsText(f);
    }
  };

  // 表单提交
  const handleGenerate = async (e) => {
    e.preventDefault();
    setError("");
    setUploadError("");
    if (!k || k < 3 || k > 5) {
      setError("The k value must be between 3 and 5");
      return;
    }
    if (!fileName.endsWith(".gt")) {
      setError("The file name must end with .gt");
      return;
    }
    if (method === "upload" && !uploadList) {
      setUploadError("Please upload the encoding list file");
      return;
    }
    setGenerating(true);

    const formData = new FormData();
    formData.append("k", k);
    formData.append("directed", directed ? "1" : "0");
    formData.append("with_orbit", orbit ? "1" : "0");
    formData.append("file_name", fileName);
    formData.append("method", method);
    if (method === "upload" && uploadList) {
      formData.append("subgraph_list", uploadList);
    }

    try {
      const resp = await fetch("http://localhost:8000/api/generate_gt", {
        method: "POST",
        body: formData,
      });
      if (resp.status !== 200) {
        const data = await resp.json().catch(() => ({}));
        setError(data?.msg || "Generation failed, the backend returned an error");
        setGenerating(false);
        return;
      }
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Network or server error, build failed");
    }
    setGenerating(false);
  };

  const canGenerate = () => {
    if (!k || Number(k) < 3 || Number(k) > 5) return false;
    if (!fileName.endsWith(".gt")) return false;
    if (method === "upload" && !uploadList) return false;
    return true;
  };

  // 切换k/方法时，自动清除上传
  const handleKChange = (e) => {
    setK(e.target.value ? parseInt(e.target.value) : "");
    setUploadList(null);
    setUploadError("");
  };
  const handleMethodChange = (e) => {
    setMethod(e.target.value);
    setUploadList(null);
    setUploadError("");
  };

  return (
    <div className="gen-bg">
      <form className="gen-card" onSubmit={handleGenerate}>
        <div className="gen-title">Generate <b>.gt</b> file</div>
        <div className="gen-row">
          <span className="gen-lab">1) Choose subgraph size k:</span>
          <input
            className="gen-k"
            type="number"
            value={k}
            min={3}
            max={5}
            onChange={handleKChange}
            style={{ marginLeft: 12, width: 48 }}
          />
        </div>
        <div className="gen-row">
          <span className="gen-lab">2) Graph type:</span>
          <label className="gen-radio">
            <input type="radio" name="directed" checked={!directed}
                   onChange={() => setDirected(false)} />
            Undirected
          </label>
          <label className="gen-radio">
            <input type="radio" name="directed" checked={directed}
                   onChange={() => setDirected(true)} />
            Directed
          </label>
        </div>
        <div className="gen-row" style={{ alignItems: "flex-start" }}>
          <span className="gen-lab">3) Generation Method:</span>
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 10 }}>
            <label className="gen-radio">
              <input type="radio" name="method" value="all" checked={method === "all"}
                     onChange={handleMethodChange} />
              use all possible k-node graphlets
            </label>
            <label className="gen-radio">
              <input type="radio" name="method" value="upload" checked={method === "upload"}
                     onChange={handleMethodChange} />
              upload binary encoding list
            </label>
            {method === "upload" && (
              <div className="gen-upload-box">
                <button
                  className="gen-upload-btn"
                  type="button"
                  onClick={() => uploadRef.current.click()}
                >
                  Upload
                </button>
                <input
                  type="file"
                  accept=".txt"
                  ref={uploadRef}
                  style={{ display: "none" }}
                  onChange={handleUpload}
                />
                <span className="gen-upload-filename">
                  {uploadList && uploadList.name}
                </span>
                {uploadError && <div className="gen-upload-error">{uploadError}</div>}
              </div>
            )}
          </div>
        </div>
        <div className="gen-row">
          <label className="gen-checkbox">
            <input type="checkbox" checked={orbit} onChange={e => setOrbit(e.target.checked)} />
            Include Orbits? Yes
          </label>
        </div>
        <div className="gen-row">
          <span className="gen-lab">5) Define the file name</span>
          <input
            className="gen-filename"
            value={fileName}
            onChange={e => setFileName(e.target.value)}
            style={{ marginLeft: 16, width: 210 }}
            placeholder="mygraphlet.gt"
          />
        </div>
        {error && <div className="gen-error">{error}</div>}
        <div className="gen-row" style={{ justifyContent: "flex-end", marginTop: 16 }}>
          <button
            className="gen-generate-btn"
            type="submit"
            disabled={!canGenerate() || generating}
          >
            {generating ? "Generating..." : "Generate"}
          </button>
        </div>
      </form>
    </div>
  );
}
