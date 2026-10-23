# AIG Real3D｜咖啡色渲染 V1 下一階：真 OBJ／GLB 來源審查 Gate

## 本輪真施工
原 PR #52 已有黑色外輪廓、咖啡色平塗、法線體積陰影與低高光四個 GPU Pass，但只用**非人體橢圓網格**確認效果。現在把來源入口真正擴充成**原始 OBJ 或 GLB**，不再把文件、檔名或拓樸合格當成真人模型。

- 既有 `aig-real3d-scan-native-mesh.mjs` 解析真正 OBJ 頂點／面片、Y/Z-Up、mm 身高換算、拓樸、開放邊、不流形、退化面與可選的 21 個解剖標記。
- 既有 `aig-real3d-glb-native-mesh.mjs` 解析原始 GLB 2.0，現在在同一個咖啡色 GPU 工作區也可以選用。
- 新 `aig-real3d-source-review-gate.mjs` 強制檔案 SHA-256、尺寸、格式、幾何檢查與四正交視角 PNG SHA。來源說明／生成方式／聲明使用權限僅作紀錄，**不是來源真實性證明**。不需上傳到任何第三方。
- 可選的解剖標記 JSON 用來檢查是否有 21 個指定的 XYZ 對應點。現有 OBJ 原生 Gate 才會確認標記是否貼近原始頂點；GLB 並不會因為標記 JSON 有 21 個欄位就視為已驗證人體。
- 更新獨立工作區 `aig-real3d-human-brown-render-lab.html`：匯入原始 OBJ/GLB、填實測身高、選擇 Up 軸、權利來源聲明、可選標記 JSON；實際 GPU 取得七張同一原始網格的咖啡色/黑線圖片，下載 JSON 驗證報告。
- 任何狀況**不會將 user self-attestation 或自然外形「猜測」變成 `personAuthenticityVerified`、`naturalAppearancePASS` 或 `releasePASS`**。
- 新 Node 契約測試、真 Chromium 使用合成**非人體 OBJ** 走完整 UI/GPU/JSON 回路；現有 GLB 四層／中性 GPU QA 都保留做回歸。

## 原始模型實查
於上一正式施工 SHA `6d4cce799f12a5b8e80339e767c0b5f15e1c1f40` 全樹搜副檔名 `.obj/.glb/.gltf`：唯一符合的實體 GLB 為 **`formal-web/zoo-6ax/local-glb/aig_6ax_machine_v9.glb`，是六軸機床**。未發現可驗證、有權使用的完整真人人體掃描基底。因此：
- 沒有新人型外觀成果或影片可宣告 PASS。
- 原 V1 咖啡色四層 GPU 渲染管線 PASS ≠ 人體細節自然 PASS。
- 要進行真人 1:1 外型 Gate，仍需一份使用權清楚的真人掃描／原生人體來源及對照圖，檢查頭、頸、臉、手指、腳趾、腰腹厚度、左右比例。
- 使用者先核准的 AI 基礎渲染框架保留；多次微凹凸、縫隙與漸層精細渲染**後補**。

## 本輪禁止修改範圍
AIG 正式 Render、RGB HOME、CNC 3AX～6AX/NC、Windows/Android APK/EXE 都不修改不部署；本 PR 僅 Draft R&D Gate，任何效能、真人外觀、照片 1:1、動畫骨架與電影視覺都不報假 PASS。
