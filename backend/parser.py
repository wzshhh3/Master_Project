# backend/parser.py

import csv
import json
import os

def detect_file_type(filename):
    ext = filename.lower().split('.')[-1]
    if ext in ['csv']:
        return 'csv'
    if ext in ['txt']:
        return 'txt'
    if ext in ['json']:
        return 'json'
    return None

def convert_to_edgelist(file_path, file_type):
    """
    file_type: 'csv', 'txt', 'json'
    返回：边列表字符串（可直接写入.txt），以及节点映射dict
    """
    edges = []
    nodes_set = set()

    if file_type == "csv":
        with open(file_path, newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            src_col = next((c for c in reader.fieldnames if c.lower().startswith('s')), 'source')
            tgt_col = next((c for c in reader.fieldnames if c.lower().startswith('t')), 'target')
            for row in reader:
                src, tgt = row[src_col].strip(), row[tgt_col].strip()
                edges.append( (src, tgt) )
                nodes_set.update([src, tgt])

    elif file_type == "txt":
        with open(file_path, encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line: continue
                parts = [p.strip() for p in line.replace(",", " ").split()]
                if len(parts) >= 2:
                    src, tgt = parts[:2]
                    edges.append( (src, tgt) )
                    nodes_set.update([src, tgt])

    elif file_type == "json":
        with open(file_path, encoding='utf-8') as f:
            data = json.load(f)
            edges_raw = data.get("edges", [])
            for e in edges_raw:
                src = str(e.get("source"))
                tgt = str(e.get("target"))
                edges.append( (src, tgt) )
                nodes_set.update([src, tgt])
    else:
        raise ValueError("Unsupported file type")

    if not edges:
        raise ValueError("No edges detected, please check the file contents!")

    node_list = sorted(nodes_set)
    node2id = { node: idx+1 for idx, node in enumerate(node_list) }
    lines = []
    for src, tgt in edges:
        s_id, t_id = node2id[src], node2id[tgt]
        lines.append(f"{s_id} {t_id} 1")
    edge_txt = "\n".join(lines)
    return edge_txt, node2id


def analyze_edgelist(edge_txt):
    """
    输入边列表字符串，返回节点数、边数和简单邻接表
    """
    edges = []
    nodes = set()
    for line in edge_txt.strip().splitlines():
        if not line.strip():
            continue
        parts = line.strip().split()
        if len(parts) < 2:
            continue
        s, t = parts[0], parts[1]
        edges.append((s, t))
        nodes.add(s)
        nodes.add(t)
    node_list = sorted(list(nodes), key=lambda x: int(x))
    return {
        "node_count": len(node_list),
        "edge_count": len(edges),
        "edges": edges,
        "nodes": node_list
    }