// src/pages/AnalyzePage.jsx
import React, { useEffect, useState } from "react";
import { useLocation ,useSearchParams, useNavigate} from "react-router-dom";
import GraphView from "../../components/GraphView/GraphView";
import OrbitHeatmapPanel from "../../components/OrbitHeatmapPanel/OrbitHeatmapPanel";
import SubgraphTypePanel from "../../components/SubgraphTypePanel/SubgraphTypePanel";
import "./AnalyzeResultPage.css";

export default function AnalyzeResultPage() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();

  const edge_path  = searchParams.get("edge_path")  || "";
  const gtrie_path = searchParams.get("gtrie_path") || "";
  const k          = parseInt(searchParams.get("k") || "3", 10);
  const directed   = searchParams.get("directed") === "true";

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [network, setNetwork] = useState([]);
  const [subgraphs, setSubgraphs] = useState({ types: [], instances: [] });
  const [orbits, setOrbits]       = useState({ gddDistribution: {}, heatmapUrl: "" });
  const [highlightNodes, setHighlightNodes] = useState([]);
  const [selectedNode, setSelectedNode]     = useState(null);

  useEffect(() => {
    if (!edge_path || !gtrie_path) {
      setError("缺少参数，3 秒后返回参数设置页");
      setTimeout(() => navigate("/analyze"), 3000);
      return;
    }
    fetch(
      `http://localhost:8000/api/analyze_from_paths` +
      `?edge_path=${encodeURIComponent(edge_path)}` +
      `&gtrie_path=${encodeURIComponent(gtrie_path)}` +
      `&k=${k}&directed=${directed?1:0}`
    )
      .then(res => {
        if (!res.ok) return res.text().then(txt => { throw new Error(txt); });
        return res.json();
      })
      .then(json => {
        if (!json.success) {
          throw new Error(json.msg || "分析失败");
        }
        setNetwork(json.network || []);
        setSubgraphs(json.subgraphs || { types: [], instances: [] });
        setOrbits(json.orbits || { gddDistribution: {}, heatmapUrl: "" });
      })
      .catch(err => {
        console.error(err);
        setError(err.message.replace(/<[^>]+>/g, "") || "未知错误");
      })
      .finally(() => setLoading(false));
  }, [edge_path, gtrie_path, k, directed, navigate]);

  if (loading) {
    return <div className="result-loading">Analyzing, please wait...</div>;
  }
  if (error) {
    return <div className="result-error">{error}</div>;
  }

  return (
    <div className="dashboard-root">
    <div className="main-graph">

      {/* 左上：网络视图 */}
      
        <GraphView
          elements={network}
          highlightNodes={highlightNodes}
          onNodeClick={setSelectedNode}
        />

      </div>

      {/* 右上：子图类型与实例 */}
      <div className="subgraph-panel">
        <SubgraphTypePanel
          types={subgraphs.types}
          instances={subgraphs.instances}
          onInstanceSelect={nodes => {
            setHighlightNodes(nodes);
            setSelectedNode(null);
          }}
        />
      </div>

      {/* 底部：Orbit Heatmap + GDD 表 */}
      <div className="orbit-panel">

        <OrbitHeatmapPanel
          heatmapUrl={orbits.heatmapFile}
          gddDistribution={orbits.gddDistribution}
          selectedNode={selectedNode}
          K={k}
        />
        

      </div>
    </div>

  );
}