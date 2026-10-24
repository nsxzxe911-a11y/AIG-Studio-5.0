# AIG Real3D 極速研發 V85｜六方向曲面真來源深度／遮蔽及未知側面

2026-10-24。接續已通過 Source + Chromium 真 GPU 雙 Gate 的 Draft PR #84「長方體上／下／前／後／左／右六面封閉」與 PR #83 常駐 Worker 多模組協調。此階將立體完整性驗證推向**非方塊曲面**，仍不對未拍到的側面虛構幾何、也不以增加網格或平滑假人替代真來源。

## 重要區別

1. **六個方向的渲染**：同一份已存在的 OBJ 網格，可從 +X/-X/+Y/-Y/+Z/-Z 六向投影出最近 source triangle ID、深度、靠後的幾何深度差、被遮住／低於格線解析度的原始面片。這只證明同一份資料從多方向可檢視，不等於六個攝影機真正掃描了物體，也**不能倒推照片未拍到的背面**。
2. **六份原始掃描證據**：只有實際分方向提供的掃描、來源授權、相機校正與誤差量測才能再作來源 authenticity Gate。本次支援可選的同來源 SHA 用戶宣告觀測面片 sidecar `AIG_REAL3D_USER_DECLARED_VIEW_COVERAGE_V1`，即使六個方向宣告齊全，仍標 `USER_DECLARED_NOT_INDEPENDENTLY_AUTHENTICATED`，不可讓未認證掃描自動 PASS。
3. **曲面不同於方塊**：橢圓形曲面不能硬要求 X/Y/Z 六個平坦面。V85 使用原始三角形真法線與深度投影，面片仍全部來自 source Indexed XYZ，不新增側壁，且保留原始拓樸 open/nonmanifold/winding、封閉體積等檢查。資料只有上下蓋面沒有真正側壁時，必然 BLOCK。

## 已施工項目

`aig-real3d-curved-six-direction-depth.mjs` 使用 `Float32Array positions`＋`Uint32Array original indexed faces`，6 × 有界 16–64 格的源三角形重心座標軟體投影；每個格點追蹤 **nearest original face ID、最近表面深度、最遠交會深度與遮蔽厚度**。分類 ±X/±Y/±Z 正對來源法線的實際面數、面積、被遮蔽或小於像素的原始面片、是否存在原始來源方向幾何；原 edge 只能由兩片反向 triangle 共享才算封閉有向邊。來源超出 30 萬三角面預設上限直接 BLOCK，單次分析不修改來源 OBJ 的任何 XYZ/index。

`aig-real3d-curved-six-direction-ui.mjs` 在原高密度來源 OBJ SHA 工作區新增真控制：
- 驗證輸入的 OBJ 檔案、高度、up-axis 與前次匯入相同，否則 BLOCK 重匯入；
- 執行六向真 source depth map，報告開放邊、分方向來源面／深度／遮蔽／未知掃描證據；
- 當曲面確實封閉且原三角面 ≥2000 才使用單一 WebGL renderer 做六方向原生 512×512 **NORMALS mode 真 indexed source GPU readback + PNG SHA**，附 JSON 與六個下載連結。GPU 截圖只是來源已存在的幾何，絕不捏造 unseen mesh。

## 技術 Gate

Node 非人體橢球原本的六向曲面：六方向都能看見原始朝外法線與有界深度層、原 open edges=0、signed volume 正；僅有上下蓋面會漏側壁、open edges>0 必然 BLOCK；全部 face winding 反轉則 signed volume<0，不得過放；偽造 scan manifest SHA、非法 index、來源預算錯誤必須 BLOCK。原 source XYZ 和 indexed triangle arrays 在分析前後逐值不變。

Chromium 真 GPU 回歸在已驗證 PR #84 六方向 6912-triangle 完整長方體，以及原有高密度 226080 triangles、V83 Worker/FK/3張 GPU 證據上，增加**4320+ 真原始曲面 NONHUMAN 橢球**的 OBJ 匯入、六方向 32×32 near/far depth、6張真正 512×512 GPU readback PNG/SHA、原始 source SHA 與 missing-side 反例；任何一個 FAIL → 整體 BLOCK。

**正式限制**：這不建立人體頭頸、毛髮、皮膚或完整真人掃描；沒有真六方向多相機掃描來源，也沒有照片 1:1 人體、動畫、生理關節或實機 CNC、安全控制器／Android Windows FPS 認證。PR #85 保持 Draft，不合併、不部署、不更改 Render AIG RGB HOME、AIG-II、AIG Studio 5.0 CNC 或正式 APK/EXE。
