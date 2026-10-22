# AIG-II 手機 3AX — 原圖逆向工程 + 真數值 Real3D 斷點

日期：2026-10-23 Asia/Taipei；原正式網站 Render 上次可信 LIVE `8895a7ff`。
本記錄對應後續待驗證的原 Render 網站來源分支 `web/aig-dual-formal-runtime-20261016`，不可將 committed source 等同 LIVE 或全系統正式 Gate。

## 原始 Authority 圖
- 手機核准 ID: `AIGII-MOBILE-3AX-CURRENT-20261016`；檔名 `05_3AX.png`，實際 JPEG/JFIF 原始位元組；864×1536；431467 bytes；SHA256 `4f46a4c1f1ed7c71165108ed13f4809201794c16ebc397987d06d1be1f773e28`。
- 這張手機原圖在 Library 的 bytes 已實際取回核對，尺寸 / digest 完全相符。原圖不自動當作網頁 3D 模型 / HTML 控制元件；網站 `formal-web/visual-authority/mobile/05_3AX.png` 尚缺經認證的實體檔，原生 4K 與 Windows 最終 Authority 尚未驗收。
- 原圖 UI 基準：頂部 AIG RGB、全域十模組導覽、中央機械模具大型窗口、左側相機、右側 XYZ/工具/材料、底部單節與速度/圖層/STOP。
- 以實際原始像素逆向解析：`3ax-mobile-reverse-map.json` 包含 47 個 region / sourcePixels x-y-width-height / normalized [0..1] / Button ID / Shared Command ID，堅持互動是 DOM 控制而不是 PNG 看似可按的區域。

## 新手機 NC-first 工作頁 (獨立路由)
- `3ax-mobile-workspace.html`、`3ax-mobile-workspace.css`、`3ax-mobile-workspace.mjs`：繁中黑底 RGB 操作，手機豎向/橫向與 Windows 瀏覽器可用；>=720px 大加工區 70–74%，手機窄畫面將右側資訊移至工件下方，不讓上下功能擠壓工件主視窗。
- 不改/撤掉原已驗證的 `3ax-nc-workbench.html`；新首頁增加清楚的獨立手機逆向版入口。
- 真數值渲染復用原 `shared-3d/aig-real3d-replay-lab.mjs` + NC parser + G0/G1 1.3 material removal。相機 iso/top/front/left/right/fit/zoom、Stock/Tool/Toolpath layer flags、25/50/100/200% *simulation* playback time、safe simulation pause 都回到同一核心。
- 機台離線燈為真實 `MACHINE DISCONNECTED`，JOG、4AX/5AX/6AX、AI、完整 Fanuc/真 3D 機台 GLB、碰撞/刀柄/真機輸出 BLOCK。畫面上的 `stop` 僅停止本地 NC 數值回放，不冒充真機 E-Stop。
- 本機 NC Working Copy 延用既有讀寫/重新整理恢復/不同分頁衝突防護；來源改變必須重新解析，保留原 Core 不回退。

## 真實 CAD 比例與 3D 逆向邊界
- `3ax-mobile-reverse-core.mjs`：確切原圖 region source coords → viewport responsive relative coords (僅 UI 參考)。
- 真 CAD 平面四點以上對應 `{imagePixel:[u,v],cadMm:[X,Y]}` 才可建 homography。無已知 CAD grid/origin/真實尺度、錨點不夠／共線／投影錯誤時 BLOCK；現行數學只解 coplanar XY，Z 深度與機台物理幾何皆不可從單張 2D 推估，校準不能寫入 NC 或據此生成真加工安全承諾。
- 在折疊次頁中提供可操作的四點 JSON 量測輸入／校準／XY 點查詢；近零僅顯示 0.000（不動原浮點座標）。

## 測試與交付界線
- `aig-3ax-mobile-reverse.test.mjs`：47 regions、來源 SHA、不可按危險功能、正常/共線 4-點 CAD 平面投影、Z 不生成。
- `aig-3ax-mobile-reverse.real-browser.mjs`：真 Chromium WebGL phone 360×780、wide 432×935、landscape 915×412、Authority resolution 864×1536、desktop 1440×900；CAM view & layers 真 callback，54mm³ G1, 0mm³ G0, unsupported G43 BLOCK, XY plane button state and zero formatting.
- 新手機 3AX 回歸隔離驗證 PR #25, Actions #39826291863 於本記錄建檔時未查到終局 PASS；該 Gate 未成功前不可觸發正式 Render 生產部署，也不得稱已交付正式新手機 UI。
- 前一輪 #39825885159 Gate RED **僅因經量測 XY -0.000 顯示格式**；原 3AX WebGL NC-first desktop/phone/landscape 54mm³ 均成功，修正只影響畫面顯示。
- 正式原始 3AX 機台／虎鉗／刀柄 GLB 校準模型、真多軸運動、0.001mm 全面精度和雙平台 APK/EXE 仍 BLOCK。

## 下一步
1. 等候 #39826291863 實際 SUCCESS，RED 立即修正；安全保持上一個已驗證 Render LIVE 版本。
2. 如 PASS，Render 對準 exact HEAD SHA 部署，再以直接讀取公開網站三頁的 Chromium 截圖/數值 Gate 验證，不憑 Render 显示 LIVE 就自動宣布功能 PASS。
3. 以用戶已核准的手機 JPEG 原始 bytes 作為獨立已驗證來源上傳網站、建立真 3AX GLB 機台幾何/運動學，之後按原 image region 真逆向逐一接 CAD/CAM/SIM，禁止用已撤銷 438 圖或工程殼回退。
