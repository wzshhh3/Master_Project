# Graphlet Explorer (Subgraph & GDA Visualization)

A **FastAPI + React** tool for:

- Uploading & previewing directed/undirected networks (third column weight optional)
- Running **GT-Scanner** (g-trie) to enumerate subgraphs and compute orbits (GDD)
- Computing & plotting **DGCM** (Directed Graphlet Correlation Matrix)
- Comparing **two** networks with **GDA** (Graphlet Degree Agreement)
- Interactive visualization of networks, subgraph types/instances, and one-click download of DGCM images

---

## Table of Contents

- [Project Structure](#project-structure)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Data & File Formats](#data--file-formats)
- [Key Features](#key-features)
- [Troubleshooting](#troubleshooting)

---

## Project Structure

```
graphlet-app/
├─ backend/
│  ├─ gtscanner/                 # GT-Scanner executable (GTScanner)
│  ├─ outputs/                   # Runtime outputs (DGCM images, exports)
│  ├─ resources/
│  │  └─ orbit_maps/
│  │     ├─ orbit_mappings_3.txt
│  │     └─ orbit_mappings_4.txt
│  ├─ gt_input/                  # Optional sample/temporary inputs
│  ├─ orbits/                    # Optional intermediate outputs
│  ├─ gtscanner_utils.py         # GT-Scanner calls, DGCM/GDA utilities
│  ├─ parser.py                  # Edge list parsing
│  └─ main.py                    # FastAPI entrypoint
│
├─ frontend/
│  ├─ public/
│  ├─ src/
│  │  ├─ components/
│  │  │  ├─ GraphView/
│  │  │  ├─ OrbitHeatmapPanel/
│  │  │  └─ SubgraphTypePanel/
│  │  ├─ pages/
│  │  │  ├─ HomePage/
│  │  │  ├─ UploadPage/
│  │  │  ├─ PreviewPage/
│  │  │  ├─ AnalyzePage/                # choose task/params, upload .gt
│  │  │  ├─ AnalyzeResultPage/          # single-network results
│  │  │  ├─ UploadSecondNetworkPage/    # for GDA
│  │  │  └─ GdaResultPage/              # two networks + DGCM + GDA
│  │  ├─ App.js, index.js, App.css, ...
│  ├─ package.json
│
├─ example_network.txt
└─ .venv/ or venv/                      # Python virtual env (recommended)
```

---

## Requirements

- **Python** 3.9+ (3.10/3.11 recommended)
- **Node.js** 16+ (18 LTS recommended)
- **WSL** on Windows (the code uses `wsl` to run GT-Scanner); on Linux/macOS run natively
- **GT-Scanner** executable available as `backend/gtscanner/GTScanner`

### Python dependencies (example `requirements.txt`)

```
fastapi
uvicorn[standard]
python-multipart
numpy
matplotlib
scipy
pydantic
```

---

## Quick Start

### 1) Install dependencies

```bash
# Backend
cd backend
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
# macOS/Linux
# source .venv/bin/activate
pip install -r requirements.txt
```

```bash
# Frontend
cd ../frontend
npm install
```

### 2) Prepare GT-Scanner & orbit mappings

- Place **GTScanner** executable at: `backend/gtscanner/GTScanner`
- Place orbit mapping files at: `backend/resources/orbit_maps/`
  - `orbit_mappings_3.txt`, `orbit_mappings_4.txt`
  - **Format:** two columns, space separated: `<originalOrbit> <mappedOrbit>`
    ```
    0 3
    1 4
    2 2
    ...
    ```

### 3) Run

```bash
# Backend (port 8000)
cd backend
uvicorn main:app --reload --port 8000
```

```bash
# Frontend (port 3000)
cd ../frontend
npm start
```

Open: **http://localhost:3000/**

---

## Data & File Formats

### Edge list

- Three columns: `source target weight` (weight can be ignored; use `1`)
- Node labels are **1-based integers**
- Example:
  ```
  1 12 1
  1 21 1
  12 3 1
  ...
  ```

### GDD file (produced by GT-Scanner)

- One line per orbit:  
  `orbit - x1:y1, x2:y2, ...`
- Meaning: in this orbit, **y** nodes appear **x** times.  
  Example: `5-1:2,2:1` → in orbit 5, two nodes appear once, one node appears twice.

---

## Key Features

- **Upload & Preview**: upload an edge list, preview node/edge counts and a quick layout.
- **Single-Network Analysis**:
  - Upload or generate `.gt` (g-trie) file
  - Choose directed/undirected and subgraph size **k (3–5)**
  - **Subgraph enumeration** with types & instances (panel supports hover preview and export)
  - **Orbit (GDD) counting** → **orbit mapping** → **DGCM** computation & heatmap
- **Two-Network GDA**:
  - In AnalyzePage choose **GDA** mode, set params
  - Upload the second network → GdaResultPage
  - Show two networks, two DGCM images, and the **GDA score**
  - One-click **download** of both DGCM images (client-side download; no backend ZIP needed)



---

## Troubleshooting

1) **`/api/upload` 404**  
   This project uses `/api/upload_second_network` for the second graph. Ensure the frontend calls the correct route. Also ensure the backend is running on **:8000** and CORS rules allow your frontend origin.

2) **Cytoscape shows a blank canvas / only one node**  
   Verify the response contains **edges** in the `cyto` array. Node/edge IDs must be **strings**. Force a re-render by using a React `key`:
   ```jsx
   <CytoscapeComponent key={JSON.stringify(net1)} elements={net1} ... />
   ```

3) **WSL/GT-Scanner call fails**  
   On Windows, ensure WSL is installed and `win_to_wsl_path` in `gtscanner_utils.py` converts paths correctly. Ensure `backend/gtscanner/GTScanner` exists and is executable.

4) **`scipy` import error**  
   Install inside the **activated virtual environment**: `pip install scipy`. If still failing on Windows, upgrade pip or use a compatible Python version.

5) **Orbit mapping not applied**  
   Make sure files exist in `backend/resources/orbit_maps/`. Names must match: `orbit_mappings_3.txt`, `orbit_mappings_4.txt`. Format: two columns per line, e.g. `0 3`.

---


