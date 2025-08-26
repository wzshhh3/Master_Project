import React, { useState , useMemo} from "react";
import CytoscapeComponent from "react-cytoscapejs";
import "./SubgraphTypePanel.css";


function exportInstancesToCSV(instances, filename = "subgraphs.csv") {
  if (!instances || !instances.length) return;
  let csv = "instanceId,binary,nodes\n";
  for (const inst of instances) {
    csv += [
      inst.instanceId,
      `"${inst.binary}"`,
      `"${inst.nodes.join(" ")}"`
    ].join(",") + "\n";
  }
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}


// 新增导出为CSV的函数
function exportAllInstancesToCSV(instances) {
  if (!instances?.length) return;
  // header
  let csv = "instanceId,binary,nodes\n";
  for (const inst of instances) {
    csv += [
      inst.instanceId,
      `"${inst.binary}"`,
      `"${inst.nodes.join(" ")}"`
    ].join(",") + "\n";
  }
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "all_subgraph_instances.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function SubgraphTypePanel({ types = [], instances = [], onInstanceSelect }) {
  const typeStat = useMemo(() => {
    const map = {};
    for (const inst of instances) {
      map[inst.binary] = (map[inst.binary] || 0) + 1;
    }
    return Object.entries(map).map(([binary, count]) => ({ binary, count }));
  }, [instances]);

  const [selectedType, setSelectedType] = useState(null);
  const [hoverType, setHoverType] = useState(null);

  const genElements = (binary, nodes) => {
    const k = Math.sqrt(binary.length);
    const els = nodes.map(id => ({
      data: { id, label: String(Number(id) + 1) }
    }));
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) {
        if (binary[i * k + j] === "1") {
          els.push({
            data: { source: nodes[i], target: nodes[j] }
          });
        }
      }
    }
    return els;
  };

  const legendInst = hoverType
    ? instances.find(inst => inst.binary === hoverType)
    : null;

  const filtered = selectedType
    ? instances.filter(inst => inst.binary === selectedType)
    : [];

  return (
    <div className="subgraph-panel">
      <div className="type-list">
        {typeStat.map(t => (
          <div
            key={t.binary}
            className={`type-item${t.binary === selectedType ? " selected" : ""}`}
            onClick={() => setSelectedType(t.binary)}
            onMouseEnter={() => setHoverType(t.binary)}
            onMouseLeave={() => setHoverType(null)}
          >
            {t.binary} ({t.count})
          </div>
        ))}
      </div>

      {/* 图例 */}
      {legendInst && (
        <div className="type-legend">
          <div style={{ fontWeight: "bold", marginBottom: 4 }}>
            Type: {hoverType}
          </div>
          <CytoscapeComponent
            elements={genElements(legendInst.binary, legendInst.nodes)}
            style={{ width: 110, height: 110, background: "#f0f0f0", borderRadius: 8, marginBottom: 6 }}
            layout={{ name: "circle" }}
            stylesheet={[
              {
                selector: "node",
                style: {
                  "background-color": "#3182ce",
                  "text-valign": "center",
                  "font-size": 22,
                  color: "#fff"
                }
              },
              {
                selector: "edge",
                style: {
                  "line-color": "#555",
                  "target-arrow-shape": "triangle",
                  "curve-style": "bezier",
                  width: 2
                }
              }
            ]}
          />
        </div>
      )}

      <div className="inst-list">
        {filtered.map(inst => (
          <div
            key={inst.instanceId}
            className="inst-item"
            onClick={() => onInstanceSelect(inst.nodes.map(id => Number(id) + 1))}
          >
            <CytoscapeComponent
              elements={genElements(inst.binary, inst.nodes)}
              style={{ width: 100, height: 100 }}
              layout={{ name: "circle" }}
              stylesheet={[
                {
                  selector: "node",
                  style: {
                    "background-color": "#48bb78",
                    label: "data(label)",
                    "text-valign": "center",
                    "font-size": 20,
                    color: "#fff"
                  }
                },
                {
                  selector: "edge",
                  style: {
                    "line-color": "#999",
                    "target-arrow-shape": "triangle",
                    "curve-style": "bezier",
                    width: 1
                  }
                }
              ]}
            />
            <div className="inst-info">ID: {inst.instanceId}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button
          className="export-btn"
          
          disabled={!selectedType}
          onClick={() => {
            const exportInstances = instances.filter(inst => inst.binary === selectedType);
            exportInstancesToCSV(exportInstances, `subgraphs_${selectedType}.csv`);
          }}
        >
          Export
        </button>
        <button
          className="export-btn"

          onClick={() => exportAllInstancesToCSV(instances)}
        >
          Export All
        </button>
      </div>
    </div>
  );
}
