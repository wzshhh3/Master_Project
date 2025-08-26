// src/components/GraphView.jsx
import React, { useRef, useEffect, useMemo, useState } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import "./GraphView.css";

export default function GraphView({ elements = [], highlightNodes = [], onNodeClick }) {
  const cyRef = useRef(null);
  const [cyKey, setCyKey] = useState(0);

  // 把需要高亮的节点直接写到 elements 的 classes 里，避免运行时对 cy 操作
  const elementsWithHighlight = useMemo(() => {
    const hl = new Set(highlightNodes.map(String));
    return (elements || []).map(ele => {
      // 只处理节点；边保持不变
      if (ele?.data?.id != null) {
        const isHL = hl.has(String(ele.data.id));
        if (!isHL) return ele;
        const classes = ele.classes ? `${ele.classes} highlighted` : "highlighted";
        return { ...ele, classes };
      }
      return ele;
    });
  }, [elements, highlightNodes]);

  // 每次元素准备好后强制重建 Cytoscape 组件，规避内部状态脏引用
  useEffect(() => {
    const id = requestAnimationFrame(() => setCyKey(k => k + 1));
    return () => cancelAnimationFrame(id);
  }, [elementsWithHighlight.length]);

  // remount 后再对高亮节点做一次 fit（安全地调用）
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !highlightNodes?.length) return;
    try {
      const sel = highlightNodes.map(id => `#${String(id)}`).join(",");
      if (sel) cy.fit(sel, 40);
    } catch { /* no-op */ }
  }, [cyKey, highlightNodes]);

  return (
    <CytoscapeComponent
      key={cyKey}                       // ← 关键：强制 remount
      elements={elementsWithHighlight}
      style={{ width: "100%", height: "100%" }}
      layout={{ name: "cose", animate: false }}  // 更稳：关闭动画布局
      cy={(cyInstance) => {
        cyRef.current = cyInstance;
        if (onNodeClick) {
          // 防止重复绑定
          cyInstance.off("tap", "node");
          cyInstance.on("tap", "node", evt => onNodeClick(evt.target.id()));
        }
      }}
      stylesheet={[
        {
          selector: "node",
          style: {
            label: "data(id)",
            "background-color": "#3182ce",
            "text-valign": "center",
            color: "#fff",
            "font-size": 10
          }
        },
        {
          selector: "edge",
          style: {
            "curve-style": "bezier",
            "line-color": "#aaa",
            "target-arrow-shape": "triangle",
            width: 1
          }
        },
        {
          selector: ".highlighted",
          style: {
            "background-color": "#e53e3e",
            "border-color": "#e53e3e",
            "border-width": 3
          }
        }
      ]}
    />
  );
}
