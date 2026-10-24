# AIG Real3D 極速 V87｜一次建通用材質引擎，後續配方批次擴充

日期：2026-10-24。接續已雙 Gate 技術 PASS 的 PR #86 動物皮毛材質／分件衣物來源。改變施工方法：**不能再一種材料寫一套程式**。電影材質成千上萬，核心應是一次建好多層共同渲染管線，以結構化配方資料加入新材質，而不是新增專屬 JS／GLSL 程式。

## 真正落盤

- 新 aig-real3d-material-recipe-engine.mjs：統一資料格式 AIG_REAL3D_V87_MATERIAL_LIBRARY_V1；JSON 一次允許 1–64 組安全 recipe，同時可含動物表面、織布、金屬、木紋、皮革或使用者自行定義的新 family/id。每 recipe 最多四層色彩、透明混合權重、粗糙度、金屬度、規律度和遮罩類型（SOLID、NOISE、STRIPES、FACING）。未知 ID/family 無需改 shader。
- 一個共用 WebGL1/WebGL2 shader 預先定義固定四層 uniforms，材質編譯器將每 recipe 轉換成 16 個 RGBA + 16 個光照/混合參數。Shader 不接受任何使用者 Javascript、GLSL 原碼，JSON 中夾帶陌生欄位／注入／第 5 層／非法數值必須 BLOCK。
- 用 shared source 原 original Indexed XYZ mesh working scene 建材質差異，不增加新 triangles、positions、normals 或更換來源 SHA。兩次 640×640 原生 GPU PNG 使用同一個 renderer，查帳材質切換後 original VBO/EBO 初次上傳次數、byte 數及 GL buffers created 必須完全相同。
- Real3D 原本 OBJ 工作區新增「匯入整份材質庫 JSON」和配方選單、真 GPU 對照／PNG 下載、JSON SHA 證據；附示範配方毛皮、藍布、拉絲金屬、木紋、皮革（這五個只是本類 shader 能做的**視覺近似範例**，不是只有五種硬編碼）。使用者之後可以自行匯入 JSON 一次 64 種完全未在程式中出現的名稱，數量大的材質庫再分批載入。

## 必須誠實的技術界限

本輪 shader 做的是低成本有界程序式顏色／roughness／metallic／遮罩混合，不是完整電影級 PBR material graph：**沒有**額外 UV texture、normal/displacement map、真正各向異性、clearcoat、透射玻璃與折射、次表面散射、織物纖維模型、真毛絲幾何、皮膚延展與衣物布料物理。它解決「材質種類增加時不要每次改核心」的**擴充架構**，沒有宣稱自動提供全部電影物理。這些特殊光學功能未來可以按共同 shader feature 能力一次增加，再由數千個配方重用，而不是逐種類施工。

## Gate

- Node：一份有 64 組完全不同使用者配方 ID 的 JSON 庫，一次讀入並逐組 compile；全部套用同一原網格，mesh reference/positions/indices 逐項不變。第五層、注入 GLSL、不合法值、重複 ID、大於 64、來源不存在等 fail closed。
- Chromium：保持 V86 動物表面及獨立衣物 GPU／V85 六向曲面／V84 六面立體／V83 常駐 Worker 高密度來源回歸。以**未寫入原始碼**的自訂 movie-material JSON（兩組）批次匯入，真 Browser UI 選取、兩次原生 GPU 材質 SHA 不同、原 Indexed GPU buffers 原樣，換第二組未知 family 仍使用同一 shader，下載真 PNG bytes 與 SHA。
- 正式人體、自然狗毛絲、動態衣物、真多人多相機掃描、Android/Windows 硬體長期 FPS／熱安全、CNC 實機安全一律 BLOCK。PR Draft、不合併、不部署；Render RGB HOME、AIG-II／AIG Studio 5.0 CNC、APK、EXE 不改。
