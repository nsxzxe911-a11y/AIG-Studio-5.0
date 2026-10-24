# AIG Real3D 極速 V88｜UV 貼圖、切線空間法線貼圖與共用 Clearcoat 節點

2026-10-24。承接已雙技術 Gate PASS 的 Draft PR #87（可透過 JSON 批次增加 64 組材質配方），沿用一套共同 WebGL shader，而非每一種電影材質寫新特例。PR 只做隔離開發，正式 Render RGB HOME、AIG-II／AIG Studio 5.0 CNC、Android APK／Windows EXE 不動。

## 真正新增功能

- 新 `aig-real3d-material-texture-nodes.mjs`：原始 3D 網格只使用 source-provenance GLOBAL Indexed XYZ、normals、indices。接入同 source SHA 的**使用者原始 per-vertex UV0 JSON sidecar**，以每個真來源 triangle 原 XYZ 與 UV 微分計算每頂點切線及 bitangent handedness。退化 UV、偽造 SHA、非法 RGBA 數組、超出範圍尺寸／normal 強度均 BLOCK；不從照片偷偷推測 UV 或補原網格三角面，也不將程序性假形狀當掃描人體。
- Renderer 的原 WebGL1／WebGL2 Shader 新增 **真 UV 採樣 Albedo RGBA、Tangent-Space Normal RGBA**；normal direction 經原 source normal+tangent+bitangent 轉換後作用於實際光照；新增可選 `clearcoat` 高光強度（非物理示範）。V87 4 層材料 shader uniforms 同時可用；換材質時不需新增 shader 原碼。真原生 640×640 GPU PNG/SHA 檢查。
- `aig-real3d-webgl.mjs` 的 GPU map 資源由 renderer 追蹤與 destroy；來源 XYZ／normal／index 仍用首次已建立的三個 VBO/EBO。對具有原始 per-vertex UV 的 working material mesh 額外建立兩個 buffer（UV + 4D tangent），**不重新上傳原 XYZ／法線／三角面**；貼圖另建 1–2 個 GPU texture，與 geometry buffer accounting 分開。
- V88 Lab 真按鈕：來源 OBJ/SHA 驗證後上傳 UV JSON、Albedo PNG、選填 Normal PNG、clearcoat；輸出材質前後兩張真 GPU PNG 和 SHA，並證明源 geometry 不改／buffer 純增 UV/Tangent，不以模型渲染成功宣稱缺失側壁已有掃描來源。UV sidecar schema `AIG_REAL3D_V88_USER_SOURCE_UV0_V1`，結構 `{schema,sourceSha256,uvByNode:{[nodeId]:[u0,v0,...]}}`，UV 必須由真來源製圖或掃描產生。貼圖限制 2–512px RGB(A)，PNG/WebP 原檔上限 2MB；不是電影 4K 貼圖管線。
- 光學功能限制：clearcoat 是**簡化鏡面高光，不是真正多層物理 BRDF**；UV/Normal 是真 shader sampling，但沒有真各向異性微纖維 BSDF、玻璃折射傳輸、SSS 皮膚、纖維立體位移、狗毛外擴輪廓、動態毛絲／布料碰撞、電影拍攝用色彩管理；這些必須實作共同特性模組並驗證，不能用材質名稱宣稱全部 PASS。

## 驗收

Source Node：使用非人體 Indexed 原始方塊 24 vertices／12 triangles，加逐來源頂點 UV0、RGBA Albedo+Normal map，確認真 tangent 計算、正常 cross handedness、原 mesh XYZ/index 引用不變。錯誤 source SHA、退化三角 UV、不完整 RGBA、沒 normal 資料卻要求 normal strength、違規強度都 BLOCK。

Chromium real GPU：保持 V87 自訂 JSON 配方、V86 毛皮分層／分件衣物、V85 6方向曲面、V84 六面、V83 Worker/FK 高密度真 GPU 回歸；新增實際非人體 48×48 起伏曲面（4,418 片原始 Indexed triangles）及明示 per-vertex UV map，真正建立 Albedo+Normal map，並**同時套用 V87 一般材質配方**。原身體首先建立 3 VBO/EBO，後續法線/UV 只新增 2 buffer 和 2 texture，原 XYZ／normal／index GPU bytes 不重新上傳，原 source normals/index 逐位保持；兩張真 GPU 640px PNG SHA 必須不同，下載 PNG bytes 後回算 SHA。一項不符 = BLOCK。

真實人體或動物掃描的原始外型、照片 1:1、毛皮物理、服裝自然貼合、整機 Android／Windows 60/120 FPS、CNC Fanuc 安全尚未驗證，保持 BLOCK。獨立 Draft 不合併、不部署。
