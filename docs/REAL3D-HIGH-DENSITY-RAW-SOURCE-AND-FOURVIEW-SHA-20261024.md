# Real3D 下一核心｜高密度真來源 OBJ GPU 分塊＋來源／四視角照片 SHA 證據 V1

日期：2026-10-24。以已驗證 PR #65 為基準，繼續往可信原始人體高密度網格邁進。本階不生成程序化人體、不製造隱藏的五指／後側、不把非人體測試當真掃描。

## 已發現並實際修復的容量缺口

既有 `aig-real3d-scan-native-mesh.mjs` 只支援最多 110,000 頂點及 180,000 三角面、14MB 原始文字；對真高密度來源可能直接拒絕。為避免在原 CNC／舊 Real3D 檢查器引入效能回退，本次新增**獨立**匯入路線 `aig-real3d-dense-source-obj.mjs`，最大 350,000 原始頂點、700,000 原始三角面，原文字不超過 50MB（超限就 BLOCK 而不是自動精簡）。

- 真正解析本機 OBJ 原始 `v` 與 `f`、支援四邊以上的固定來源扇形三角化及負索引。所有原始三角面保留，避免 LoD／網格細分／SDF／代替來源的人體。
- 利用實際身高與 Y／Z Up，換算原始 XYZ 到公尺空間。一次計算原始三角面產生的法線；依原始三角面順序分塊（每塊不超過 52,000 個來源 unique vertices、不超過 95,000 三角面）並映射局部 GPU 索引，使 WebGL1 不必依賴 32-bit index extension。**原始面片總數精確一致**，僅在塊與塊邊界重複來源 vertex references；沒有改變任何物理表面形狀。
- 獨立 UI `匯入原始高密度 OBJ 並產生真 GPU 正面圖`，按真按鈕才讀取高密度檔、SHA-256、GPU 渲染原生 1080×1920 PNG 並核對 PNG SHA，不觸碰原 7 頁驗收流程。GPU 失敗即 BLOCK。
- 可選擇四個本機正面／側面／背面／45° 原始 PNG，每張計算真正檔案 SHA 與 decoded 尺寸；另一個真按鈕下載來源 + 四張參考圖的來源證據 JSON。缺少任一角度即標示 `completeFourViewReferenceSet:false`；即使四張齊全也只是**來源檔案哈希連結**，不能證明同一人物、拍攝校準、模型來自照片或外觀 1:1。
- 提供者填寫掃描方式、檔案來源與權利聲明僅為**自我宣告**，不得把標記檔、非人體膠囊、人體剪影或有高頂點數的網格認證成真人人體掃描。
- **本高密度新路線仍未接 21 點局部人形拓樸及自然度 4 視角自動 PASS；此類檢查保持 pending/BLOCK**。真正的頭頸、五指、腳趾需可信 OBJ、對應標記及人工外觀比對才能判斷。原始幾何數量更多本身不能證明表面細節真實。

## 真實驗收（不能過早聲稱 PASS）

Node 以明確 `NONHUMAN` 橢圓柱曲面形成真 Indexed OBJ 114,840 頂點、228,960 面，先證明舊匯入器拒絕，再要求新的分塊匯入器所有 `scene.nodes` GPU source faces 完整相等；測試負索引/不良 index/無 SHA 的拒絕策略。另一份 Node 測試檢查四張真檔 SHA 結構與缺圖／重複角度攔截。

Chromium／SwiftShader 瀏覽器必須上傳 113,400 頂點、226,080 面原始 OBJ，按真按鈕生成 WebGL 原生 1080×1920 PNG，下載 PNG／來源+四視角 SHA JSON，實際檔案 SHA 和 PNG IHDR 必須相同，並確認 `releasePASS:false`、`sourceHumanScanVerified:false`。

本 PR 保持 Draft。未 merge／未部署 Render LIVE；正式 AIG RGB HOME／CAD/CAM/3AX～6AX/NC 和原 APK／EXE 均不變。