// src/components/GraphView.jsx
import React, { useRef, useEffect, useMemo } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import "./GraphView.css";

export default function GraphView({ elements, highlightNodes = [], onNodeClick }) {
  const cyRef = useRef(null);


  // 每次 highlightNodes 改变时高亮
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.nodes().removeClass("highlighted");

    highlightNodes.forEach(id => {
      const node = cy.$id(id);
      if (node) node.addClass("highlighted");
    });

    if (highlightNodes.length) {
      cy.fit(highlightNodes.map(id => `#${id}`).join(","), 40);
    }
  }, [highlightNodes]);

  return (
    <CytoscapeComponent
      elements={elements}
      style={{ width: "100%", height: "100%" }}
      cy={cyInstance => {
        cyRef.current = cyInstance;
        cyInstance.on("tap", "node", evt => {
          onNodeClick && onNodeClick(evt.target.id());
        });
      }}
      layout={{ name: "cose", animate: true }}
      stylesheet={[
        {
          selector: "node",
          style: {
            label: "data(id)",
            "background-color": "#3182ce",
            "text-valign": "center",
            color: "#fff",
            "font-size": 10,
          },
        },
        {
          selector: "edge",
          style: {
            "curve-style": "bezier",
            "line-color": "#aaa",
            "target-arrow-shape": "triangle",
            width: 1,
          },
        },
        {
          selector: ".highlighted",
          style: {
            "background-color": "#e53e3e",
            "border-color": "#e53e3e",
            "border-width": 3,
          },
        },
      ]}
    />
  );
}
