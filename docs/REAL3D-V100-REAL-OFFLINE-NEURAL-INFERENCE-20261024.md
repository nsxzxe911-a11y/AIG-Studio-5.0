# Real3D V100｜真正本機神經網路 3D 推論（2026-10-24）

Status: **Draft / Real executable runner landed, trained-model runtime verification BLOCK until licensed weights + capable local machine are actually available.**

繼承 V99，使用者只需要肩部以上照片即可作為候選推論輸入；看不見的全身與背面仍需 AI 推估並標註來源。V100 不接受低階 SDF/Metaball/Template Morph/Subdivision 人物冒充真女主角，不覆蓋原圖或正式 Render/CNC UI。

## 本輪交付的「真正推論」程式

`tools/real3d_v100_triposr_local.py` 會使用官方 [VAST-AI-Research/TripoSR](https://github.com/VAST-AI-Research/TripoSR)（MIT code + pretrained weights）**執行真 PyTorch neural inference**。這是可於 Windows/ Linux 本機部署的獨立生成推論引擎，不是向第三方 API 送照片，也不是只有假 callback 的 V99 placeholder。程式不會在缺少權重時自造 GLB 或聲稱完成；一定要有本機安裝的 upstream 原始 `run.py`、本機模型資料夾內 `config.yaml` 和 `model.ckpt`。

TripoSR 官方操作提供 `python run.py image --pretrained-model-name-or-path /absolute/model/path --model-save-format glb --device cuda:0 --output-dir output`，預設約 6 GB GPU VRAM 需求；CPU 可執行但未保證延遲或大圖品質。原版主要針對單一物件 3D 生成。此路線**尚未證明真人臉部相似度、可動畫全身人體、髮絲、服裝和 4K 電影品質**。

V100 真運行條件：
- 指定本機照片路徑、照片 SHA256、本機已合法取得的 model.ckpt 及 SHA256、上游 run.py 的 SHA256；
- 以 `HF_HUB_OFFLINE=1`、`TRANSFORMERS_OFFLINE=1`、`HF_DATASETS_OFFLINE=1` 執行：不能偷偷遠端下載或外洩來源圖；
- 限定 GPU／CPU、Marching Cubes 解析度、執行逾時和輸出目錄；輸出目錄必須空白以避免採用陳舊舊模型；
- 真正呼叫 subprocess 執行已驗證上游 PyTorch TripoSR `run.py`；若模型缺權重或程式錯誤則直接 BLOCK；
- 推論完成後解碼真 GLB 2.0 版本標頭和有索引的 3D XYZ 三角面 accessor，產出來源圖／權重／run.py／最終 GLB 的 SHA、面數、實際執行時間及 GPU 參數證據；
- 產生 `output/0/mesh.glb` 和 `output/v100-inference-evidence.json`，可再透過 V99 真 GLB 匯入核心交給 V98 共用來源及 V96 4K GPU。超出 V99 的 200,000 triangles 容量會顯示 Preview BLOCK，不可偷偷更換原幾何。

## 本輪 Source Gate 及真神經模型 Gate 絕對分離

GitHub Actions `aig-real3d-v100-local-real-ml-inference-gate.yml`：

**offline-source-contract**：標準 runner 執行 Python 與 V99 GLB tests，檢查來源、缺權重 BLOCK、來源 hash BLOCK、虛假推論 provider 無法通過。測試用假權重的 `--probe` 只表示 SHA 合約正確，不是 ML 成功。

**actual-trained-model**：只在已授權實際本機模型、已核准測試圖片及有 GPU 的 self-hosted runner 同時存在，而且 `AIG_V100_LOCAL_MODEL_READY=true` 時啟用真 PyTorch 推論。若沒有安裝實機模型，此 job 預期 SKIPPED，**不能聲稱真 neural inference PASS**。

設定自行提供的 GitHub repository variables（不放權重或私人圖片到 GitHub）：

`AIG_V100_MODEL_DIR`, `AIG_V100_UPSTREAM_DIR`, `AIG_V100_TEST_IMAGE`, `AIG_V100_WEIGHTS_SHA`, `AIG_V100_IMAGE_SHA`, `AIG_V100_RUNPY_SHA`。

範例本機命令（所有路徑/SHA 都須使用實際來源，不是填假字串）：

```bash
python3 tools/real3d_v100_triposr_local.py \
  --image /local/approved-input.png --image-sha <image-sha256> \
  --model-dir /local/TripoSR-weights --weights-sha <model.ckpt-sha256> \
  --upstream-dir /local/TripoSR --run-py-sha <run.py-sha256> \
  --output-dir /local/AIG-generated-v100 --device cuda:0 \
  --mc-resolution 256 --no-remove-bg
```

`--probe` 會**僅驗證本機路徑、bytes/SHA、runner**，不跑真正推論，回傳 `SOURCE_MODEL_PRESENT_BUT_NO_INFERENCE`。不支援無網路裝置時自動偷偷退階成低面數人體。

## 模型身份／美術／交付 Gate

不論是 TripoSR 或未來自有 AIG 3D neural inference，輸出模型仍是單圖推估候選。正式女主角 Authority 圖、臉部身份相似度、體態自然性、頭髮服裝、GLB 動作骨架、PBR 物理材質、4K60 電影真影格、2:12:08 全片以及雙平台 APK/EXE 必須各自驗收，不能從「模型產生 GLB」推導 PASS。

V100 本輪無提供權重與真正攝影照片，所以正常 GitHub Runner 僅 source-contract Gate 可以 PASS，GPU 模型推論 Gate 仍 BLOCK/SKIPPED。不可假稱已完成 1:1 女主角模型。

正式 AIG Render：<https://aig-dual-formal-runtime.onrender.com/index.html#dual-projects> **保持原版未部署**。
