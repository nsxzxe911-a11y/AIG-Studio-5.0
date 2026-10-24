# Real3D V116｜真掃描來源聲明、可觀測法線連續性與遮擋候選 Gate

第三專案 FastModel，接續 V115 PR #117。**目標不是讓合成模型看起來更像真人，而是驗證實際來源是否足夠可靠，可以相信正在渲染的表面。**

## 新增
- `aig-real3d-v116-capture-normal-occlusion.mjs`：兩份照片／深度檔 SHA 對應兩張相機 capture manifest（獨立 capture ID、Device ID、UTC 時間、獨立相機標定文件 SHA、量測方式）。格式異常／同一來源重用立即 BLOCK。
- `sourceClass` 區分 `SYNTHETIC_FIXTURE` 與 `DECLARED_SENSOR_CAPTURE`。後者只是「上傳者聲稱資料來自量測相機」，**不驗證設備簽章、不讀取校正文件本身、不宣稱已經實測或認證光學精度**。沒有獨立外部設備證據時 realScannerGroundTruthGate 永遠 BLOCK。
- 只從真來源深度及相機內外參推算兩視角局部表面單位法線，使用四鄰近真測量差分求 3D 切向向量，不用程序性曲面模板，也不改 glTF 頂點。
- 雙向將已量測 XYZ 投影到另一視角，同一來源 3D 座標下核對法線方向的絕對內積角度及共視區 XYZ 毫米殘差，計算 P95／最大值與逐向樣本數。
- 相機邊框、缺失深度及局部深度跳變分離統計；深度跳變只被標為「可能是遮擋／量測不連續」，**不能未經證據認證成真正物體遮擋**。含未審核跳變的資料不能以剩餘平滑區數值冒稱整體法線 PASS。
- 基於 V115 已檢查的原 GLB 及去重 GLB 工作副本來源 SHA／邊界，並可選 V116 驗證在 V99 GLB ingest、V107 A/B 真 GPU 之前；預設選項關閉以維持 V112～V115 舊路徑。
- 繁中工作區補獨立來源 JSON、深度容許差與法線容許角度、報告與 BLOCK 審查訊息。**測試預設合成例只代表範例，不可當成任何掃描儀的校正數據。**

## Gate
1. Node：合成雙相機平面可觀測來源，驗 V112 多相機深度→V114 來源面去重→V115 真邊界→V116 實際法線／共視點殘差 PASS；再故意引入未經其他視角確認的 50mm 深度突起、全部缺深度、偽造照片 SHA、重用校正文件 SHA，必須 BLOCK。
2. `DECLARED_SENSOR_CAPTURE` 即使填滿欄位也只能表示聲明完整，不得稱硬體已驗證或真實人類 1:1。
3. Chromium 使用真正 PNG/深度 JSON 檔、GLB 真解析、真 GPU A/B 機構、75% 自下向上裁切，確保 V115+V116 共同 Gate 合格才允許選用去重副本。V112 原路徑回歸。
4. 未取得有授權的實體掃描／真多視角相機校準真值以前，**人體五官、毛髮、衣物體積、未知背面、實際掃描精度、1080p/60FPS 或真人 1:1 等完整驗收全部 BLOCK**。

GitHub 研究 Draft，不合併、不上唯一正式 Render 網站、不動 AIG-II／AIG Studio CNC/Fanuc 或 Android APK/Windows EXE。
