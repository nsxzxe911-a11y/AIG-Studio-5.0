# Real3D V92｜原始骨架全／半包覆＋五球類接觸聯動（Draft）

2026-10-24。接續 V91（五球類三維動力）與 V90（原始 OBJ UV / GPU 姿勢工作副本），本階正式研究「**不是貼圖移動，是骨架帶動真 3D 表面與球的力學接觸**」。獨立 Draft、不動正式 Render RGB HOME、CNC、APK、EXE。

## 真正新增

1. **Source-bound rig contract**：原始 source scene + 來源 SHA 綁定的使用者明示 joint manifest。每個 joint 包含穩定 ID、父關節、來源 bind pivot、單位旋轉 axis、角度上下限；每個來源頂點必須有 1–4 個已知 joint weights（總和=1），未提供關節、來源不符或超角度一律 BLOCK。**不會從不存在的掃描推測骨架。**
2. **Full / Half Wrap**：FULL_WRAP 與 HALF_WRAP 的骨架 FK、逐頂點 LBS 變形、法線與接觸點運算完全相同；HALF_WRAP 只對整個原始來源 node 的可見性做選擇，不會刪除未顯示側面、重拓樸、重建沒看見的皮膚，並不保證一定更快。真正判斷可見性需結合相機與 BVH，不能只因名稱就宣稱擁有自動視角裁切。
3. **Actor-anchor → ball IMPACT**：來源綁定 HAND/FOOT/BAT/RACKET/PADDLE 的局部世界錨點，使用骨架兩時刻位置差計算真正表面速度；同時間的球心由 V91 物理積分求得。接觸點距球心必須在真球半徑容忍內，且相對速度必須朝向球；通過後才產生 V91 IMPACT 衝量，不能用預寫的假球路代替。
4. **同一真 GPU 影格**：真原始來源 XYZ／法線和 indexed triangles 保留，Working Copy 使用原 renderer `updateMeshVertices` 的 `bufferSubData`；同一 GPU scene 同時渲染關節表面變形與球的 XYZ/角速度。球不是圖層貼紙。錄影用 `captureStream(0)` + `MediaRecorder` 的實際 WebM frames；不具備 API 時 BLOCK。
5. **可操作繁中研究頁**：`formal-web/shared-3d/aig-real3d-rig-sport-film-lab.html`，真 FULL/HALF／五球類／Play/Pause／影格滑桿／原生 GPU PNG／WebM 錄製，並顯示來源證據和物理衝量。

## 實際驗證

- `aig-real3d-rig-wrap-contact.test.mjs`：來源 SHA、頂點權重、親子關節、角度限制、半包覆仍運動、來源位置不可更動、Impossible Contact BLOCK、由真錨點移動造成球體 IMPACT。
- `aig-real3d-v92-rig-sport-film.test.mjs`：五運動共用來源錨點，骨架／球一個場景、原始 XYZ 不變、HALF_WRAP 不移除骨架。
- `aig-real3d-rig-sport-film.real-browser.mjs`：非人體 4,418 張原始三角面和真球體同時在 640×640 native GPU 渲染，兩個影格 GPU PNG SHA 不同，GPU 增量更新/0 全新 position/index 上傳；支援時產生真 WebM 檔案 SHA。
- 同時回歸既有 V91 V90 V89 V88 Source/GPU。另修復沿用 V89 的**單色平面來源**被原有 LIT 模式 palette gate 判定 AIG3D_GPU_SNAPSHOT_BLANK：改用來源直接提供有高度變化及正確法線的 4,418 nonhuman 三角面，不放寬 GPU 原本的可見性與真來源門檻。

## 限制（全部持續 BLOCK）

本輪使用**明確聲明為非人體的已知原始測試網格**及示範物理係數；不證明人體、狗、鳥、魚的真實來源外觀、解剖骨架自動辨識、肌肉／皮膚物理、真羽毛／魚鰭／尾巴、布料物理、照片 1:1、球拍網格或圓框真實接觸。LBS 不是高階肌肉有限元素法，可能有關節塌陷與穿模。來源 SHA 合約只核對 manifest 內相符的值，來源提供者真實性未獨立認證。半包覆尚未量化 GPU FPS 優勢；WebM 頻率、音訊、1080p60、實機 Android / Windows / Fanuc CNC 尚未完成端對端 Gate。

產品 Gate 為 **BLOCK**，僅 isolated Draft PR，禁止合併與部署，禁止升版號冒充正式交付。
