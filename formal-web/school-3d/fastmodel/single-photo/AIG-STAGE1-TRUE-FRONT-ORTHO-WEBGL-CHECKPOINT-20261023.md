# Real3D Stage 1 — 成人男女真正正面照（2026-10-23）

## 指令與範圍
使用者指令「正面照 執行」是在連續要求修正錯誤 45° 快照、開發可調年齡／高矮胖瘦人體之後下達。本輪**只做實際正面照片先行**，不能用 45°、透視扭曲、AI 靜態概念圖、舊 fail PNG 冒充目前 WebGL 快照。小孩／中年／老人與胖瘦參數尚未接入，不能聲稱已完成。

## 真正修改
- `aig-stage1-true-front-camera.mjs`: 讀取原男／女技術人體的真正 XYZ mesh bounds，產生 -Z 正面的 **THREE.OrthographicCamera** 相機契約，正視平視：yaw 0°, pitch 0°, roll 0°；1080×1920 直向 native output；目標人體高度約 82%，左右上下留白；不沿用拍 45° 的透視 camera/FOV/roll。
- `auditAIGStage1FrontClip()`: 逐一將真正人體網格頂點投影到正交畫面，檢查所有頭頂、左/右手、足部都沒有裁掉。換成桌面 1920×1080、手機 390×844、4K 3840×2160 都依正確 aspect 重算。
- `aig-stage1-true-front-photo.mjs`: **既有同一個 WebGLRenderer** 建立一個臨時 1080×1920 render target，真實渲染 stageScene 的男／女技術人體，讀回 GPU RGBA bytes，檢查非空白像素、PNG IHDR、SHA256，保存原場景和渲染狀態；沒有第二個 WebGL context，且繼續採 0.001 mm 正式座標契約。
- `scene-runtime-studio.html`: 新增清楚的正面照專區／「目前人體正面」／「男生＋女生兩張正面」按鈕及真 1080×1920 PNG 下載畫廊。
- `aig-stage1-dual-adult-runtime.mjs`: 真按鈕 callback，各自逐張拍男性貼身泳褲、女性連身泳衣正面，顯示獨立檔案與 SHA，換模型清除舊證據資格，失敗標 BLOCK；原 4K→3K→2K→1080P、四視角 Runtime 保留。
- `tests/aig-stage1-true-front-camera.test.mjs`: 真正的人體頂點與手腳裁切、正交、零傾斜、手機與桌面比例，變更畫面寬高不能改人體 mm 源；人為裁切會 FAIL。
- `tests/aig-stage1-true-front-photo.real-browser.mjs`: Chromium（SwiftShader WebGL）打開原 Runtime，按雙人體真正正面照，應生成兩張各 1080×1920 GPU PNG，驗證 bytes、顯示自然長寬、相機 0°、SHA 相異、Visual Gate 依然 BLOCK。
- `.github/workflows/aig-real3d-3-5-unified-appearance-gate.yml`: 獨立專用 `stage1-true-frontal-photo-only` job，和其他失敗 45° 工作隔離，Node tests+Browser Playwright+兩張真 PNG artifact。若 CI 阻塞排隊，只能說 SOURCE 提交，不得假宣稱兩張新圖已產生。

## Stage 1 Gate
- 真實圖片尚未成功產出並目視確認前：**BLOCK**。
- 即使正面 1080×1920 GPU 證據成功：只能代表 **正面相機/像素/裁切 Gate**，不能說男、女解剖自然或衣服接合已通過。
- 45° 角錯誤依然待下一階獨立修復；不得用零角正面照假冒四視角完整 PASS。
- 未併入正式 Render 網站、未更新 APK/EXE，原 `aig-new-home.html` 版面及 CNC 核心不變。
