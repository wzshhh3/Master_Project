# backend/main.py

from fastapi import FastAPI, File, UploadFile , Query, Form,HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse,PlainTextResponse
import os
from fastapi.staticfiles import StaticFiles
from parser import detect_file_type, convert_to_edgelist,analyze_edgelist
import subprocess
import uuid
import shutil
import subprocess
from gtscanner_utils import generate_gtrie_file,enumerate_subgraphs, compute_orbits,calculate_gda_score



UPLOAD_DIR = "uploads"
GT_INPUT_DIR = "gt_input"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(GT_INPUT_DIR, exist_ok=True)
os.makedirs("outputs", exist_ok=True) 
GTLIB_DIR = os.path.abspath(os.path.join(os.getcwd(), "gtlib"))


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")


def get_gtlib_filename(k, directed, with_orbit):
    """
    根据参数自动选取合适的gt文件名
    """
    k = int(k)
    if directed and with_orbit:
        name = f"or_dir{k}.gt"
    elif directed and not with_orbit:
        name = f"dir{k}.gt"
    elif not directed and with_orbit:
        name = f"or_undir{k}.gt"
    else:
        name = f"undir{k}.gt"
    return os.path.join(GTLIB_DIR, name)


def win_to_wsl_path(win_path):
    # C:\xxx\yyy\zzz.txt -> /mnt/c/xxx/yyy/zzz.txt
    drive, rest = win_path[0], win_path[2:]
    return f"/mnt/{drive.lower()}{rest.replace('\\', '/')}"


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    filename = file.filename
    suffix = filename.split('.')[-1].lower()
    temp_path = os.path.join(UPLOAD_DIR, filename)
    with open(temp_path, "wb") as f:
        f.write(await file.read())

    # 检测文件类型
    file_type = detect_file_type(filename)
    if file_type is None:
        os.remove(temp_path)
        return JSONResponse({"success": False, "msg": "Only supports csv, txt, json formats"}, status_code=400)
    try:
        edge_txt, node2id = convert_to_edgelist(temp_path, file_type)
    except Exception as e:
        os.remove(temp_path)
        return JSONResponse({"success": False, "msg": str(e)}, status_code=400)
    # 保存为GT-Scanner用的edge_list.txt
    edge_path = os.path.join(GT_INPUT_DIR, filename + ".edges.txt")
    with open(edge_path, "w", encoding="utf-8") as f:
        f.write(edge_txt)
    return {
        "success": True,
        "filename": filename,
        "edge_path": edge_path,
        "node_map": node2id
    }


@app.get("/api/preview_info")
def preview_info(edge_path: str = Query(..., description="Path to edge_list file")):
    try:
        with open(edge_path, "r", encoding="utf-8") as f:
            edge_txt = f.read()
        result = analyze_edgelist(edge_txt)
        return {
            "success": True,
            "node_count": result["node_count"],
            "edge_count": result["edge_count"],
            "edges": result["edges"],
            "nodes": result["nodes"]
        }
    except Exception as e:
        return JSONResponse({"success": False, "msg": f"Preview loading failed：{e}"}, status_code=500)
    
@app.post("/api/upload_subgraph_txt")
async def upload_subgraph_txt(file: UploadFile = File(...)):
    if not file.filename.endswith('.txt'):
        return JSONResponse({"success": False, "msg": "Only supports .txt files"}, status_code=400)
    path = os.path.join("uploads", file.filename)
    with open(path, "wb") as f:
        f.write(await file.read())
    return {"success": True, "subgraph_txt_path": path}

@app.post("/api/upload_gtrie")
async def upload_gtrie(file: UploadFile = File(...)):
    if not file.filename.endswith(('.gt')):
        return JSONResponse({"success": False, "msg": "Only supports .gt files"}, status_code=400)
    path = os.path.join("uploads", file.filename)
    with open(path, "wb") as f:
        f.write(await file.read())
    return {"success": True, "gtrie_path": path}


@app.post("/api/generate_gt")
async def api_generate_gt(
    directed: int = Form(...),
    k: int = Form(...),
    with_orbit: int = Form(...),
    file_name: str = Form(...),
    method: str = Form(...),
    subgraph_list: UploadFile = File(None)
):
    if not (3 <= int(k) <= 5):
        return JSONResponse({"success": False, "msg": "k must be between 3 and 5"}, status_code=400)
    if not file_name.endswith(".gt"):
        return JSONResponse({"success": False, "msg": "The file name must end with .gt"}, status_code=400)

    uniq = uuid.uuid4().hex[:8]
    cwd = os.getcwd()
    output_path = os.path.abspath(os.path.join(cwd, "outputs", f"{uniq}_{file_name}"))
    subgraph_list_path = None

    if method == "all":
        # 直接查找现有gt文件，复制到output_path，返回
        gtlib_file = get_gtlib_filename(k, int(directed), int(with_orbit))
        if not os.path.exists(gtlib_file):
            return JSONResponse({"success": False, "msg": f"Preset library file not found {os.path.basename(gtlib_file)}"}, status_code=404)
        shutil.copy(gtlib_file, output_path)
        return FileResponse(
            output_path,
            filename=file_name,
            media_type="application/octet-stream"
        )

    elif method == "upload":
        if subgraph_list is None:
            return JSONResponse({"success": False, "msg": "You need to upload the encoding file"}, status_code=400)
        subgraph_list_path = os.path.abspath(os.path.join(cwd, "uploads", f"{uniq}_{subgraph_list.filename}"))
        with open(subgraph_list_path, "wb") as f:
            f.write(await subgraph_list.read())

        ok, err = generate_gtrie_file(
            directed=bool(int(directed)),
            subgraph_size=int(k),
            subgraph_list_path=subgraph_list_path,
            output_path=output_path,
            with_orbit=bool(int(with_orbit)),
            method=method
        )
        if not ok:
            if subgraph_list_path and os.path.exists(subgraph_list_path):
                os.remove(subgraph_list_path)
            return JSONResponse({"success": False, "msg": err or "Failed to generate .gt file"}, status_code=500)
        if not os.path.exists(output_path):
            return JSONResponse({"success": False, "msg": ".gt file not generated"}, status_code=500)
        if subgraph_list_path and os.path.exists(subgraph_list_path):
            os.remove(subgraph_list_path)
        return FileResponse(
            output_path,
            filename=file_name,
            media_type="application/octet-stream"
        )
    else:
        return JSONResponse({"success": False, "msg": "Illegal method"}, status_code=400)
    


def get_gtlib_filename(k: int, directed: bool, with_orbit: bool) -> str:
    """选择已有 .gt 库文件"""
    prefix = ""
    if with_orbit: prefix += "or_"
    prefix += "dir" if directed else "undir"
    return os.path.join(GTLIB_DIR, f"{prefix}{k}.gt")


# --- 已有上传 / 预览 / 生成逻辑（略，保持不变） ---
# upload_file, preview_info, upload_gtrie, api_generate_gt
# 请复用你现有的实现，这里略过，仅聚焦新增接口。


# @app.get("/api/analyze_from_paths")
# def analyze_from_paths(
#     edge_path: str = Query(...), 
#     gtrie_path: str = Query(...),
#     k: int       = Query(..., ge=3, le=5),
#     directed: int= Query(0)
# ):
#     """
#     1) 读取 edge_list，生成 network Cytoscape 元素
#     2) 调用 enumerate_subgraphs 得到 types + instances
#     3) 调用 compute_orbits 得到 gddDistribution + heatmapUrl
#     """
#     directed_flag = bool(directed)
#     try:
#         # 1) network elements
#         with open(edge_path, encoding="utf-8") as f:
#             edge_txt = f.read()
#         info = analyze_edgelist(edge_txt)
#         # 转成 Cytoscape 格式
#         nodes = [{"data": {"id": nid, "label": nid}} for nid in info["nodes"]]
#         edges = [
#             {"data": {"source": src, "target": tgt}}
#             for src, tgt in info["edges"]
#         ]
#         network = nodes + edges

#         # 2) 子图枚举
#         subgraphs = enumerate_subgraphs(
#             edge_list_win=edge_path,
#             gtrie_win=gtrie_path,
#             directed=directed_flag,
#             k=k
#         )

#         # 3) Orbit / GDD
#         orbits = compute_orbits(
#             edge_list_win=edge_path,
#             gtrie_win=gtrie_path,
#             directed=directed_flag,
#             k=k
#         )
#         # heatmapFile 返回 basename，前端拼 /outputs/heatmap
#         if orbits.get("heatmapFile"):
#             orbits["heatmapUrl"] = f"/outputs/{orbits['heatmapFile']}"
#         else:
#             orbits["heatmapUrl"] = ""

#         return {"success": True,
#                 "network": network,
#                 "subgraphs": subgraphs,
#                 "orbits": orbits}

#     except Exception as e:
#         return JSONResponse({"success": False, "msg": str(e)}, status_code=500)


@app.get("/api/export_subgraphs")
def export_subgraphs(
    edge_path: str   = Query(...),
    gtrie_path: str  = Query(...),
    k: int           = Query(..., ge=3, le=5),
    directed: int    = Query(0),
    type_binary: str = Query(..., alias="type")
):
    """
    导出某个子图类型的所有实例，格式：
      binaryString: node1 node2 node3
      ...
    """
    try:
        directed_flag = bool(directed)
        data = enumerate_subgraphs(
            edge_list_win=edge_path,
            gtrie_win=gtrie_path,
            directed=directed_flag,
            k=k
        )
        # 过滤该类型
        instances = [
            inst for inst in data["instances"]
            if inst["binary"] == type_binary
        ]
        if not instances:
            raise HTTPException(404, f"No instances of type {type_binary}")

        # 生成文本内容
        lines = [
            f"{inst['binary']}: {' '.join(inst['nodes'])}"
            for inst in instances
        ]
        txt = "\n".join(lines)

        return PlainTextResponse(
            content=txt,
            media_type="text/plain",
            headers={
                "Content-Disposition":
                  f"attachment; filename=subgraph_{type_binary}.txt"
            }
        )

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(500, f"Export failed: {e}")
    

@app.get("/api/analyze_from_paths")
async def analyze_from_paths(
    edge_path: str = Query(..., description="服务器上边列表文件的绝对路径"),
    gtrie_path: str = Query(..., description="服务器上 .gt 文件的绝对路径"),
    k: int = Query(..., ge=3, le=5, description="子图大小 k，3-5"),
    directed: bool = Query(True, description="是否有向：1 有向，0 无向")
):
    """
    1) 读 edge_list，转换成 Cytoscape.js 网络元素
    2) 调用 enumerate_subgraphs 获取子图 types + instances
    3) 调用 compute_orbits 生成 GDD 分布和 Heatmap
    返回 JSON:
    {
      success: true,
      network: [ { data: { id, label } }, { data: { source, target } }, ... ],
      subgraphs: { types: [...], instances: [...] },
      orbits: { gddDistribution: {...}, heatmapUrl: "/outputs/xxx.png" }
    }
    """
    try:
        # --------- 1. 读取并解析边列表 ----------
        if not os.path.isfile(edge_path):
            raise HTTPException(404, f"edge_path 文件不存在: {edge_path}")

        with open(edge_path, encoding="utf-8") as f:
            edge_txt = f.read()

        info = analyze_edgelist(edge_txt)
        # info 应包含 `nodes: List[str]`, `edges: List[Tuple[str,str]]`
        network = []
        for nid in info["nodes"]:
            network.append({"data": {"id": nid, "label": nid}})
        for src, tgt in info["edges"]:
            network.append({"data": {"source": src, "target": tgt}})

        # --------- 2. 子图枚举 ----------
        print(directed)
        directed_flag = directed
        ok, subgraphs, err_msg = enumerate_subgraphs(
            edge_list_win=edge_path,
            gtrie_win=gtrie_path,
            directed=directed_flag,
            k=k
        )
        # subgraphs = { "types": [ {binary, count}, ... ],
        #               "instances": [ { instanceId, binary, nodes:[...] }, ... ] }

        # --------- 3. Orbit / GDD 分析 ----------
        ok, orbits_data, err_msg = compute_orbits(
            edge_list_win=edge_path,
            gtrie_win=gtrie_path,
            directed=directed_flag,
            k=k
        )

        if not ok:
            return JSONResponse(
                {"success": False, "msg": f"compute_orbits 失败: {err_msg}"},
                status_code=500
            )

        # orbits_data = {"gddDistribution": ..., "heatmapFile": ...}
        heatmap_url = ""
        if orbits_data and orbits_data.get("dgcmFile"):
            heatmap_url = f"/outputs/{orbits_data['dgcmFile']}"

        return {
            "success": True,
            "network": network,
            "subgraphs": subgraphs,
            "orbits": {
                "gddDistribution": orbits_data.get("gddDistribution", {}) if orbits_data else {},
                "heatmapFile": heatmap_url
            }
        }

    except HTTPException as he:
        # 主动抛出的 404 / 400
        return JSONResponse({"success": False, "msg": he.detail}, status_code=he.status_code)

    except Exception as e:
        # 其他未捕获异常
        print("analyze_from_paths 运行错误：", e)
        return JSONResponse(
            {"success": False, "msg": f"服务器内部错误: {e}"},
            status_code=500
        )
    


@app.post("/api/upload_second_network")
async def upload_second_network(file: UploadFile = File(...)):
    try:
        suffix = file.filename.split(".")[-1].lower()
        if suffix not in {"txt", "csv", "json"}:
            return JSONResponse({"success": False, "msg": "只支持txt, csv, json格式"}, status_code=400)
        uid = uuid.uuid4().hex[:8]
        save_name = f"{uid}_{file.filename}"
        save_path = os.path.join(UPLOAD_DIR, save_name)
        with open(save_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        # 假设你有解析 node_map 的逻辑，可选
        node_map = {}  # TODO: 按需解析节点映射
        return {
            "success": True,
            "filename": file.filename,
            "edge_path": save_path.replace("\\", "/"),
            "node_map": node_map
        }
    except Exception as e:
        return JSONResponse({"success": False, "msg": f"上传失败: {e}"}, status_code=500)
    





@app.get("/api/gda_result")
async def gda_result(
    edge_path1: str = Query(..., description="第一个图的边列表路径（服务器绝对路径）"),
    edge_path2: str = Query(..., description="第二个图的边列表路径（服务器绝对路径）"),
    gtrie_path: str = Query(..., description="gtrie 文件路径"),
    k: int = Query(..., ge=3, le=5, description="子图大小"),
    directed: bool = Query(True, description="是否为有向图")
):
    if not os.path.exists(edge_path1):
        raise HTTPException(404, f"文件不存在: {edge_path1}")
    if not os.path.exists(edge_path2):
        raise HTTPException(404, f"文件不存在: {edge_path2}")
    if not os.path.exists(gtrie_path):
        raise HTTPException(404, f"文件不存在: {gtrie_path}")

    # 调用 GT-Scanner 分析两个图
    ok1, result1, err1 = compute_orbits(edge_path1, gtrie_path, directed, k)
    if not ok1:
        raise HTTPException(500, f"第一个图计算失败: {err1}")
    ok2, result2, err2 = compute_orbits(edge_path2, gtrie_path, directed, k)
    if not ok2:
        raise HTTPException(500, f"第二个图计算失败: {err2}")

    gda_score = calculate_gda_score(result1["gddDistribution"], result2["gddDistribution"])

    # 解析边文件生成 Cytoscape 图结构
    def parse_edgelist(path):
        with open(path, encoding="utf-8") as f:
            edge_txt = f.read()
        info = analyze_edgelist(edge_txt)
        nodes = [{"data": {"id": nid, "label": nid}} for nid in info["nodes"]]
        edges = [{"data": {"source": src, "target": tgt}} for src, tgt in info["edges"]]
        return {
            "nodes": [n["data"]["id"] for n in nodes],
            "edges": [(e["data"]["source"], e["data"]["target"]) for e in edges],
            "cyto_elements": nodes + edges
        }

    info1 = parse_edgelist(edge_path1)
    info2 = parse_edgelist(edge_path2)
    print(info1["cyto_elements"])
    print(info2["cyto_elements"])

    return {
        "success": True,
        "network1": {
            "nodes": info1["nodes"],
            "edges": info1["edges"],
            "cyto": info1["cyto_elements"]
        },
        "network2": {
            "nodes": info2["nodes"],
            "edges": info2["edges"],
            "cyto": info2["cyto_elements"]
        },
        "dgcm1": f"/outputs/{result1['dgcmFile']}",
        "dgcm2": f"/outputs/{result2['dgcmFile']}",
        "gda_score": round(gda_score, 6)
    }