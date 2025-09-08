import React, { useEffect, useState } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import "./GdaResultPage.css";

export default function GdaResultPage() {
  const params = new URLSearchParams(window.location.search);
  const edge_path1 = params.get("edge_path");
  const edge_path2 = params.get("edge_path2");
  const filename1 = params.get("filename") || "Network 1";
  const filename2 = params.get("filename2") || "Network 2";
  const k = params.get("k");
  const directed = params.get("directed");
  const gtrie_path = params.get("gtrie_path");

  const [net1, setNet1] = useState([]);
  const [net2, setNet2] = useState([]);
  const [dgcm1, setDgcm1] = useState("");
  const [dgcm2, setDgcm2] = useState("");
  const [gdaScore, setGdaScore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(
      `http://localhost:8000/api/gda_result?edge_path1=${encodeURIComponent(
        edge_path1
      )}&edge_path2=${encodeURIComponent(
        edge_path2
      )}&k=${k}&directed=${directed}&gtrie_path=${encodeURIComponent(
        gtrie_path
      )}`
    )
      .then((res) => res.json())
      .then((data) => {
        setNet1(data.network1?.cyto || []);
        setNet2(data.network2?.cyto || []);
        setDgcm1(data.dgcm1 || "");
        setDgcm2(data.dgcm2 || "");
        setGdaScore(data.gda_score || null);
      })
      .catch(() => {
        setNet1([]);
        setNet2([]);
        setDgcm1("");
        setDgcm2("");
        setGdaScore(null);
      })
      .finally(() => setLoading(false));
  }, [edge_path1, edge_path2, k, directed, gtrie_path]);

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
        "target-arrow-shape": "triangle",
        "target-arrow-color": "#a0b6e6",
        "arrow-scale": 1,
        opacity: 0.92,
      },
    },
  ];

  const downloadImage = (url, filename) => {
    fetch(url)
      .then((res) => res.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
      })
      .catch((err) => console.error(`下载 ${filename} 失败：`, err));
  };

  const handleExport = () => {
    if (dgcm1) downloadImage(`http://localhost:8000${dgcm1}`, "DGCM1.png");
    if (dgcm2) downloadImage(`http://localhost:8000${dgcm2}`, "DGCM2.png");
  };

  return (
    <div className="gdaresult-container">
      <div className="gdaresult-left">
        <div className="gdaresult-title">Display the Two Networks</div>
        {loading ? (
          <div className="gdaresult-loading">Loading...</div>
        ) : (
          <div className="gdaresult-nets">
            <div className="gdaresult-net">
              <div className="gdaresult-netlabel">{filename1}</div>
              <CytoscapeComponent
                elements={net1}
                style={{ width: "100%", height: 350, background: "#fafcfe" }}
                layout={{ name: "cose" }}
                stylesheet={style}
              />
            </div>
            <div className="gdaresult-net">
              <div className="gdaresult-netlabel">{filename2}</div>
              <CytoscapeComponent
                elements={net2}
                style={{ width: "100%", height: 350, background: "#fafcfe" }}
                layout={{ name: "cose" }}
                stylesheet={style}
              />
            </div>
          </div>
        )}
      </div>

      <div className="gdaresult-right">
        <div className="gdaresult-title">GDA Result</div>
        <div className="gdaresult-heatmaps">
          <div className="gdaresult-heatmapbox">
            <div className="gdaresult-heatmaplabel">DGCM 1</div>
            {dgcm1 && (
              <img
                className="gdaresult-heatmap"
                src={`http://localhost:8000${dgcm1}`}
                alt="DGCM 1"
              />
            )}
          </div>
          <div className="gdaresult-heatmapbox">
            <div className="gdaresult-heatmaplabel">DGCM 2</div>
            {dgcm2 && (
              <img
                className="gdaresult-heatmap"
                src={`http://localhost:8000${dgcm2}`}
                alt="DGCM 2"
              />
            )}
          </div>
        </div>
        <div className="gdaresult-score">
          <span>GDA Score: </span>
          <span className="gdaresult-scoreval">
            {gdaScore === null ? "--" : gdaScore.toFixed(4)}
          </span>
        </div>
        <button className="gdaresult-exportbtn" onClick={handleExport}>
          Download DGCM Images
        </button>
      </div>
    </div>
  );
}
