# Real3D｜下一種 Scan-Native Source Mesh（2026-10-24）

## 決議
使用者已淘汰 SDF、Metaball，並判定 Template Morph 與 Subdivision 的實際 GPU 正面外觀不合格。單一連通、0 開放邊、84,992 三角形不是人體自然度證據。

## 本輪已落盤（僅獨立研發站）
- formal-web/shared-3d/aig-real3d-scan-native-mesh.mjs：從本機原生 OBJ 讀取真正 3D 頂點與面，不自行建假人；保留 SHA-256、Y-Up/Z-Up、身高 mm→米、原始 XYZ 資料。外部材質引用忽略、不下載 URL。
- aig-real3d-scan-native-lab.html/.mjs：獨立多視角檢查站，既有共享 AIG WebGL 真實正、側、背、斜側四視角，原生 1080×1920 GPU framebuffer PNG + SHA。
- 真實拓樸檢查：開放邊、非流形邊、連通數、退化面、未用點、頂點數、三角形、三維寬高深比例；不合格拒絕四視角外觀管線。
- 解剖標記 JSON 可輸入頭頂、下巴、鼻尖、頸基、雙肩、肘、腕、拇指、食指、骨盆、雙膝、後跟與腳趾，需在實際網格附近且位置順序合理。
- Node 和 Chromium GPU 管線測試採用明確標為 SYNTHETIC NONHUMAN FIXTURE 的封閉橢圓柱，只驗證匯入、渲染與 PNG，不是人體外觀測試。

## 仍明確 BLOCK
1. 專案沒有經授權且驗證的完整真人 3D 掃描基底；本輪沒憑空造出真實人體來源。
2. OBJ UV/原生貼圖/GLB Skin Weight 尚未支援。本階不是照片 1:1 或完整人物動畫。
3. 來源真實性、臉、五指、腳趾、側面深度、男女差異、身高、照片吻合、骨架皮膚形變都要真資料驗證。
4. Draft PR 不替換 Render 正式首頁、CNC、3AX～6AX，不產 APK/EXE，也不宣告人體驗收 PASS。

## 真正可過外觀 Gate 的必要條件
有合法且可靠的完整人體基底或經授權的多視角真人照片/掃描時，保留來源 SHA、尺寸和法線，先多視角渲染比對。外觀通過後才延伸 UV、Morph/骨架、動態與手機/桌面效能。
