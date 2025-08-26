import os
import subprocess
import uuid
import matplotlib.pyplot as plt
import numpy as np
import re
import glob
import scipy.stats

def load_orbit_mapping(k):
    import os
    base_dir = os.path.dirname(__file__)
    mapping_dir = os.path.join(base_dir, "resources", "orbit_maps")
    filename = f"orbit_mappings_{k}.txt"
    mapping_file = os.path.join(mapping_dir, filename)
    orbit_map = {}

    if not os.path.exists(mapping_file):
        return orbit_map  # 返回空字典，调用者需要处理找不到的情况

    with open(mapping_file, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split()
            if len(parts) == 2:
                src, dst = parts
                orbit_map[str(src)] = str(dst)
    return orbit_map


def win_to_wsl_path(win_path):
    
    win_path = os.path.abspath(win_path)
    drive, rest = win_path[0], win_path[2:]
    return f"/mnt/{drive.lower()}{rest.replace('\\', '/')}"

def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)

def generate_gtrie_file(
    directed: bool,
    subgraph_size: int,
    subgraph_list_path: str,   # 必须有
    output_path: str,
    with_orbit: bool = False,
    method: str = "upload"
):
    """
    仅在“上传编码list”时调用
    """
    cwd = os.getcwd()
    gtscanner_path = os.path.abspath(os.path.join(cwd, "gtscanner", "GTScanner"))
    gtscanner_path_wsl = win_to_wsl_path(gtscanner_path)
    subgraph_list_path_wsl = win_to_wsl_path(subgraph_list_path)
    output_path_wsl = win_to_wsl_path(output_path)

    # 只用 -c <subgraph_list>，其它模式无需调用
    cmd = [
        "wsl",
        gtscanner_path_wsl,
        "gtrieScanner",
        "-d" if directed else "-u",
        "-s", str(subgraph_size),
        "-c", subgraph_list_path_wsl
    ]
    if with_orbit:
        cmd.append("-or")
    cmd += ["-o", output_path_wsl]

    print("[GT-Scanner call command]:", " ".join(cmd))
    try:
        res = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=600
        )
        if res.returncode != 0:
            errinfo = res.stderr.decode("utf-8") + res.stdout.decode("utf-8")
            print("[GT-Scanner Error]:", errinfo)
            return False, f"GT-Scanner fails to generate G-Trie: {errinfo}"
        return True, None
    except Exception as e:
        print("[GT-Scanner has an abnormality]:", str(e))
        return False, f"GT-Scanner has an abnormality: {str(e)}"









def enumerate_subgraphs(
    edge_list_win: str,
    gtrie_win: str,
    directed: bool,
    k: int
):
    """
    调用 GT-Scanner 以 gtrie 模式枚举子图。
    返回 (ok, {'types': [...], 'instances': [...]}, err_msg)
    """
    prefix     = uuid.uuid4().hex[:8]
    occ_prefix = os.path.abspath(f"outputs/{prefix}_occ.txt")
    summary    = os.path.abspath(f"outputs/{prefix}_summary.txt")

    exe_wsl    = win_to_wsl_path(os.path.abspath(os.path.join("gtscanner","GTScanner")))
    edge_wsl   = win_to_wsl_path(edge_list_win)
    gtrie_wsl  = win_to_wsl_path(gtrie_win)
    occ_wsl    = win_to_wsl_path(occ_prefix)
    sum_wsl    = win_to_wsl_path(summary)

    cmd = [
        "wsl", exe_wsl,
        "gtrieScanner",
        "-d" if directed else "-u",
        "-g", edge_wsl,
        "-s", str(k),
        "-m", "gtrie", gtrie_wsl,
        "-or",
        "-oc", occ_wsl,
        "-o",  sum_wsl,
        "-th","4"
    ]
    print("[GT-Scanner enumerate_subgraphs cmd]:", " ".join(cmd))

    try:
        res = subprocess.run(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=600
        )
        if res.returncode != 0:
            err = (res.stderr + res.stdout).decode("utf-8", "ignore")
            print("[GT-Scanner Error enumerate_subgraphs]:", err)
            return False, None, f"GT-Scanner 枚举子图失败：{err}"
    except Exception as e:
        print("[GT-Scanner Exception enumerate_subgraphs]:", e)
        return False, None, f"调用 GT-Scanner 异常：{e}"

    # 解析 summary
    types = []
    try:
        lines = open(summary, encoding="utf-8").read().splitlines()
        for idx, ln in enumerate(lines):
            # 最后一行 row 中会紧跟 count，例如 "000   80 | ..."
            m = re.match(rf'^([01]{{{k}}})\s+(\d+)', ln.strip())
            if m and idx >= 2:
                row1 = lines[idx-2].strip()
                row2 = lines[idx-1].strip()
                row3 = m.group(1)
                count = int(m.group(2))
                binary = row1 + row2 + row3
                types.append({'binary': binary, 'count': count})
    except Exception as e:
        return False, None, f"Failed to parse summary: {e}"

    # 2) 解析 occurrence 文件
    instances = []
    try:
        occ_files = glob.glob(f"{occ_prefix}*")  # 匹配所有以 occ_prefix 开头的文件
        for occ_file in occ_files:
            with open(occ_file, encoding="utf-8") as f:
                for ln in f:
                    if ':' not in ln:
                        continue
                    binstr, rest = ln.strip().split(':', 1)
                    nodes = rest.strip().split()
                    instances.append({
                        'instanceId': uuid.uuid4().hex[:8],
                        'binary': binstr,
                        'nodes': nodes
                    })
    except Exception as e:
        return False, None, f"Failed to parse occurrences: {e}"

    return True, {'types': types, 'instances': instances}, None






def compute_orbits(
    edge_list_win: str,
    gtrie_win: str,
    directed: bool,
    k: int
):
    """
    调用 GT-Scanner 计算 GDD 并生成 heatmap。并计算 DGCM（相关性矩阵），生成热力图。
    """
    prefix  = uuid.uuid4().hex[:8]
    gdd_dir = os.path.abspath(f"outputs/{prefix}_gdddir")
    os.makedirs(gdd_dir, exist_ok=True)

    # 你需要实现 win_to_wsl_path()
    exe_wsl    = win_to_wsl_path(os.path.abspath(os.path.join("gtscanner","GTScanner")))
    edge_wsl   = win_to_wsl_path(edge_list_win)
    gtrie_wsl  = win_to_wsl_path(gtrie_win)
    gdd_wsl    = win_to_wsl_path(gdd_dir)
    heatmap_win = os.path.abspath(f"outputs/{prefix}_heatmap.png") 
    dgcm_win    = os.path.abspath(f"outputs/{prefix}_dgcm.png")

    cmd = [
        "wsl", exe_wsl,
        "gtrieScanner",
        "-s", str(k),
        "-m", "gtrie", gtrie_wsl,
        "-g", edge_wsl,
        "-d" if directed else "-u",
        "-or",
        "-odir", gdd_wsl
    ]
    print("[GT-Scanner compute_orbits cmd]:", " ".join(cmd))

    try:
        res = subprocess.run(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=600
        )
        if res.returncode != 0:
            err = (res.stderr + res.stdout).decode("utf-8", "ignore")
            print("[GT-Scanner Error compute_orbits]:", err)
            return False, None, f"GT-Scanner 计算 orbits 失败：{err}"
    except Exception as e:
        print("[GT-Scanner Exception compute_orbits]:", e)
        return False, None, f"调用 GT-Scanner 异常：{e}"

    # 2) 解析 GDD 文件
    gddDistribution = {}
    found_txt = False
    for root, dirs, files in os.walk(gdd_dir):
        for fn in files:
            if fn.lower().endswith(".txt"):
                dist_path = os.path.join(root, fn)
                with open(dist_path, encoding="utf-8") as f:
                    for line in f:
                        line = line.strip().rstrip(",")
                        if not line or '-' not in line or ':' not in line:
                            continue
                        left, right = line.split("-", 1)
                        orbit_id = left.strip()
                        pair_str = right.strip()
                        data = {}
                        for p in pair_str.split(","):
                            if not p or ":" not in p:
                                continue
                            x, y = p.split(":")
                            data[int(x)] = int(y)
                        if data:
                            if orbit_id not in gddDistribution:
                                gddDistribution[orbit_id] = {}
                            for k_, v in data.items():
                                gddDistribution[orbit_id][k_] = gddDistribution[orbit_id].get(k_, 0) + v
                found_txt = True
                break
        if found_txt:
            break

    # 3) orbit全映射
    orbit_mapping = load_orbit_mapping(k)
    mapped_gdd = {}
    for orig_orbit, dist in gddDistribution.items():
        # 支持str/int混用
        mapped_id = orbit_mapping.get(str(orig_orbit), str(orig_orbit))
        # 合并：可能多个原orbit映射到同一个新orbit
        if mapped_id not in mapped_gdd:
            mapped_gdd[mapped_id] = {}
        for deg, cnt in dist.items():
            mapped_gdd[mapped_id][deg] = mapped_gdd[mapped_id].get(deg, 0) + cnt

    # 4) 构造节点-graphlet degree矩阵（所有后续分析、作图都用 mapped_gdd 的 orbit）
    node_orbit_count = {}
    for orbit, dist in mapped_gdd.items():
        for degree, cnt in dist.items():
            node_orbit_count.setdefault(orbit, [])
            node_orbit_count[orbit] += [degree] * cnt

    orbits = sorted(node_orbit_count.keys(), key=lambda x: int(x))
    n_nodes = max([len(v) for v in node_orbit_count.values()]) if node_orbit_count else 0
    node_mat = np.zeros((n_nodes, len(orbits)), dtype=int)
    for j, orbit in enumerate(orbits):
        degrees = node_orbit_count[orbit]
        for i, d in enumerate(degrees):
            node_mat[i, j] = d

    # 5) 计算DGCM（相关系数矩阵）并画图
    dgcm = np.ones((len(orbits), len(orbits)))
    for i in range(len(orbits)):
        for j in range(len(orbits)):
            if i == j:
                dgcm[i, j] = 1.0
            else:
                dgcm[i, j] = scipy.stats.spearmanr(node_mat[:, i], node_mat[:, j])[0]
                if np.isnan(dgcm[i, j]):
                    dgcm[i, j] = 0

    fig, ax = plt.subplots(figsize=(7, 6))
    im = ax.imshow(dgcm, cmap='RdYlGn', vmin=-1, vmax=1)
    ax.set_xticks(range(len(orbits)))
    ax.set_xticklabels(orbits)
    ax.set_yticks(range(len(orbits)))
    ax.set_yticklabels(orbits)
    for i in range(len(orbits)):
        for j in range(len(orbits)):
            ax.text(j, i, f"{dgcm[i, j]:.2f}", ha="center", va="center", color="black", fontsize=7)
    fig.colorbar(im, ax=ax, label="Spearmanr")
    plt.title("DGCM")
    plt.tight_layout()
    fig.savefig(dgcm_win, bbox_inches="tight")
    plt.close(fig)

    # 6) 画GDD heatmap（也用 map 后的 orbit）
    if mapped_gdd:
        degrees = sorted({deg for dist in mapped_gdd.values() for deg in dist.keys()})
        mat = np.zeros((len(orbits), len(degrees)), dtype=int)
        for i, orb in enumerate(orbits):
            for j, deg in enumerate(degrees):
                mat[i, j] = mapped_gdd[orb].get(deg, 0)
        fig, ax = plt.subplots()
        im = ax.imshow(mat, aspect="auto")
        ax.set_xlabel("Degree")
        ax.set_ylabel("Orbit")
        ax.set_xticks(range(len(degrees)))
        ax.set_xticklabels(degrees, rotation=45)
        ax.set_yticks(range(len(orbits)))
        ax.set_yticklabels(orbits)
        fig.colorbar(im, ax=ax, label="Count")
        fig.tight_layout()
        fig.savefig(heatmap_win, bbox_inches="tight")
        plt.close(fig)
    else:
        heatmap_win = ""

    return True, {
        "gddDistribution": mapped_gdd,
        "heatmapFile": f"{os.path.basename(heatmap_win)}" if heatmap_win else "",
        "dgcmFile": f"{os.path.basename(dgcm_win)}"
    }, None



def calculate_gda_score(gdd1: dict, gdd2: dict) -> float:
    """
    计算两个网络之间的 GDA 相似性分数。
    输入为两个网络的 mapped_gdd 字典，格式为：
    {orbit_id: {degree: count, ...}, ...}
    """
    # 收集所有出现过的 orbit id（两边可能不同）
    all_orbits = sorted(set(gdd1.keys()).union(set(gdd2.keys())), key=lambda x: int(x))

    # 构造 GDD 矩阵，每行是一个 orbit，每列是 degree 出现次数（统计频率）
    def gdd_to_vector(gdd: dict, all_orbits: list) -> list:
        orbit_vectors = []
        for orb in all_orbits:
            deg_count = gdd.get(orb, {})
            if not deg_count:
                orbit_vectors.append(np.zeros(1))  # 默认填 0
                continue
            max_deg = max(deg_count.keys())
            vec = np.zeros(max_deg + 1)
            for deg, cnt in deg_count.items():
                vec[deg] = cnt
            vec = vec / np.sum(vec) if np.sum(vec) > 0 else vec
            orbit_vectors.append(vec)
        return orbit_vectors

    vecs1 = gdd_to_vector(gdd1, all_orbits)
    vecs2 = gdd_to_vector(gdd2, all_orbits)

    # 每个 orbit 分别计算 GDA 分数（1 - 差异）
    gda_scores = []
    for v1, v2 in zip(vecs1, vecs2):
        # 补零到相同长度
        if len(v1) < len(v2):
            v1 = np.pad(v1, (0, len(v2) - len(v1)))
        elif len(v2) < len(v1):
            v2 = np.pad(v2, (0, len(v1) - len(v2)))

        diff = np.sqrt(np.sum((v1 - v2) ** 2))
        gda = 1 - (1 / np.sqrt(2)) * diff
        gda_scores.append(gda)

    # 最终 GDA 得分是平均值
    return float(np.mean(gda_scores))