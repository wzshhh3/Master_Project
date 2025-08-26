import random

def generate_network_file(num_nodes, num_edges=None, output_path="network.txt"):
    edges = set()
    max_possible_edges = num_nodes * (num_nodes - 1) // 2  # 无向图最大边数
    
    if num_edges is None:
        num_edges = random.randint(num_nodes, max_possible_edges // 2)  # 默认边数适中
    elif num_edges > max_possible_edges:
        raise ValueError("边数不能超过最大可能边数")

    while len(edges) < num_edges:
        u = random.randint(1, num_nodes)
        v = random.randint(1, num_nodes)
        if u != v:
            edge = tuple(sorted((u, v)))
            edges.add(edge)

    with open(output_path, "w") as f:
        for u, v in sorted(edges):
            f.write(f"{u} {v} 1\n")

    print(f"成功生成网络图文件：{output_path}，包含 {num_nodes} 个节点，{len(edges)} 条边。")

# 示例调用
generate_network_file(num_nodes=27, num_edges=50, output_path="example_network.txt")
