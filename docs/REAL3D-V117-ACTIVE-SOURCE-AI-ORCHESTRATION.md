# FastModel Real3D V117｜來源證據主動建模控制器與五軸 GPU 自巡檢

第三專案 FastModel／Real3D；接續 **V116 PR #118**。本階真正新增可操作的主動路由器與完整工作頁 callback：已觀測的原始照片像素 → 前景實際分離／審核 → V109 原圖材質索引 GLB → V99 真 GLB parser → V107 真五軸 GPU 五姿態巡檢。它減少人工操作，但**沒有載入或執行神經網路／LLM 權重**；稱為「AI 工作流程控制」不能偷換成已完成 AI 自動 3D 人體推論。

## 可執行核心
- `aig-real3d-v117-evidence-orchestrator.mjs`，實際執行 V110 原始 alpha／簡單不透明背景本機像素辨識、V111 使用者標記的複雜背景分割，或具獨立 SHA 與核對勾選的人工遮罩。來源 RGB 永不因控制流程改色。
- 同一張來源自動判斷安全的 GLB 輸出路線；只有來源可信才 `READY_FOR_TRUE_GLB_GPU`，複雜背景不能辨識則 `NEEDS_SOURCE_REVIEW`，矛盾的來源 mask、缺失 depth、單照片要求完整 1:1 自動 `BLOCK`。所有 Gate 透明列示，禁止把 2.5D 宣稱成完整物理人體背面。
- 在現有繁體中文照片頁新增真正操作的「自主分析」「自主執行」及來源計劃／GPU 結果。自主執行沿用 V109 原生 callback，真正產出來源 GLB 並由 V99 importer 和 V107 WebGL renderer 繪圖，沒有建立另一套工程殼。
- 五軸自巡檢採五個**真正 GPU render**姿態（A0/B0、A90/B0、A0/B90、A90/B90、A45/B180 與 50% 從腳向頭高度裁切），逐次讀取 GPU draw 回報；必須五幀都符合原始模型 SHA、三角面數、A/B、原始高度裁切狀態才 PASS，隨後復原 A0/B0/100%。不能傳遞假回報繞過 `verifyAIGReal3DV117RealGPUInspection`。
- 任一檔案更換，在實際生成前核對照片 SHA 與來源尺寸；絕不把旧圖片計畫偷偷用在新模型。新產生的 GLB SHA 及來源照片 SHA 分別稽核。

## 可信能力與尚未完成
- **有的**：來源像素分類、選路、尺寸／深度來源驗證、真 GLB 建立、真 WebGL 五軸多角度檢查、GPU SHA/三角面審計、影像資料原 RGB 保護；支持可觀測前表面與有獨立深度時的可觀測深度。
- **沒有的**：已訓練神經網路人體語義模型、任意複雜背景零標記自動分割、單張頭像可信推導真實全身解剖、不可見背面、立體服裝厚度、真人 1:1 的獨立感知相似度 Gate。這些保持 BLOCK，不能假稱已完成。
- **下一真正 AI 門檻**：如要導入 learned AI，必須有可用且獲授權的權重／模型、實際 runtime 推論數據、模型版本／SHA、輸入輸出證據與獨立真人影像評測。未達門檻不能把規則式自動化叫作神經網路推論。
- V112–V116 多視角真深度／相機標定工作區透過連結可直接進入；單照片不能自動假補多相機 source。

## 真 CI
1. Node：透明 PNG、簡單不透明背景、複雜棋盤背景 BLOCK、經人工標記成功、獨立 mask 路線、真 3D 要求 BLOCK、假 depth BLOCK、GPU 假姿態或不同 source SHA BLOCK；並回歸 V110/V111。
2. Chromium：真正上傳合成棋盤 RGB 先試一鍵自動必須停下；純色不透明照片一鍵 → 真 GLB/V99 → 五姿態 GPU → SHA/三角面一致且可下載；要求完整 1:1 停止；透明圖片再一鍵真 GLB/五姿態、SHA 改變、驗收原 V109。GPU 截圖與 JSON 證據可供重看。
3. 此測試圖為**合成圖片，不是女主角真掃描**。五 GPU PASS 不代表完整 1:1、拍攝人體外觀忠實或實際 60 FPS。正式 Release Gate 保持 BLOCK。

只在 GitHub **Draft PR** 施工，不合併、不部署唯一正式 Render 網站、不改 AIG-II／AIG Studio CNC/Fanuc、APK 或 EXE。
