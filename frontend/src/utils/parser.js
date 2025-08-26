export function parseEdges(text) {
  const lines = text.trim().split('\n');
  const elements = [];
  const nodeSet = new Set();

  lines.forEach(line => {
    const [source, target] = line.split(/\s+/);
    elements.push({ data: { id: `${source}-${target}`, source, target } });
    nodeSet.add(source);
    nodeSet.add(target);
  });

  nodeSet.forEach(node => {
    elements.push({ data: { id: node } });
  });

  return elements;
}
