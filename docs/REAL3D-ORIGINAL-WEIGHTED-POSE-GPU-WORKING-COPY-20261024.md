# Real3D 下一核心｜原始 3D 頂點權重與真 GPU 變形工作副本 V1

日期：2026-10-24；延續尚未合併的 Draft PR #69（繼承 #68、#67、#66）。不改 Render LIVE RGB 首頁、不改 AIG-II / Studio CNC、不發 APK/EXE。

## 從靜態曲面到可量測的三維動作

- PR #69 已能用原始 GLOBAL Indexed XYZ 讀出十指局部曲面、開放縫與標記折角；**標記彎曲不是有動態變形**。
- 此階新增獨立原始來源「明確權重工作副本」，只有使用者本機提供與 OBJ SHA 一致的稀疏頂點權重 JSON，才允許對**一根**指定手指的一個 Middle 關節建立 CPU 三維姿勢。這不是自動 Rig，不會杜撰缺少的皮膚、關節或手指。
- JSON schema 為 AIG_REAL3D_EXPLICIT_VERTEX_WEIGHTS_V1：sourceSha256、sourceVertexCount、side、finger、joint=Middle、pivotSourceXYZ、axisWorld、vertexWeights=[[原始全域 index,0–1 權重],...]。原始關節 3D 標記必須存在；偽造來源 SHA、錯誤 index、重複權重、無靜止錨點、超過 ±45° 或來源 pivot 遠離原始 mesh 均 BLOCK。
- 工作副本從原 OBJ Float32Array 複製原始世界頂點。每個有非零權重的來源頂點根據軸、關節 pivot 和顯式權重作 Rodrigues 旋轉；原始 OBJ 的每一個 GLOBAL face index 完全保留，**不細分、不減面、不平滑、不觸碰原始 source XYZ**。GPU chunk metadata 新增 originalGlobalVertexIds（不改 scene 的原 face），每塊在新 pose scene 建立局部三角面與來源法線重新計算，GPU 分塊邊界不當作裂縫。
- 建立 0° 原始靜態參考以及可自訂 -45°～45° 單姿勢預覽（預設 20°）；逐來源三角面量測實際頂點位移、全原始邊長伸長/壓縮、P95 應變、翻轉三角面與面積接近塌陷。任何風險技術指標只作人員檢查依據，不宣稱自然人體運動。
- 真按鈕讀取 47 點標記本機 JSON + 明確權重 JSON，輸出原生 WebGL 1080×1920 變形 PNG、檔案 SHA 和診斷報告。無權重資料即 BLOCK。所有檔案與圖像只留本機，不上傳其他服務。

## 不能夠誤判 PASS

真正人體骨架的旋轉中心、皮膚物理彈性、關節攣縮／張力、指間碰撞、真人 1:1 和運動連續性皆**未獲來源認證**。即使 GPU PNG、原始面片數和頂點應變 Gate 完成，報告必須保留 animationRigPASS=false、skinMotionNaturalnessPASS=false、releasePASS=false。不得將「人造非人體 QA 工件」當成真人。下一階才適合處理多關節時間序列、幾何自碰撞及高負載效能測試。

## 驗收

Node：非人體封閉 Indexed cube（真 pose 位移、0° 原樣保持、GPU 原 faces 完全相同、原 source 沒有改動）、無權重/偽 SHA/重複 vertex/全動錨點/錯 pivot/超角度/損壞 chunk mapping 都 BLOCK。
Chromium：原 >11萬頂點真 GPU 高密度來源流程不退化，新增按鈕先驗無 manifest BLOCK，再用明確本機非人體 marker + source SHA 權重，實際變形原三維 XYZ、正面原生 GPU PNG 和 SHA/JSON 下載一致。未經完整 GitHub Source / Browser 雙 Gate SUCCESS 不得聲稱 PR 技術 PASS。原正式網站和全部正式裝置發版維持不動。
