# Real3D V1｜原生 21 點解剖標記投影到真 GPU 四視角（2026-10-24）

## 本輪實際增加
承接 PR #55 的 12 等高影像誤差分析：新增 **原始來源 XYZ → 與正式 WebGL 一致的正交相機 → 精確像素位置** 的投影引擎，且必須先通過既有 OBJ 21 點網格貼合／部位順序審核。

- `aig-real3d-native-anatomy-projection.mjs`：只接受來源 `objText`、21 個已提供的 XYZ 標記、`sourceSha256`、實測身高及 `landmarkAuditComplete:true`。不在沒有來源 3D 的情況下憑想像推算部位。
- 支援 **Y-Up / Z-Up** 的 OBJ，將原始頂點和標記用完全一致的原生模型中心、等比例身高變換定位；匹配既有 `validateAIGInspectionCapturePlan()` 正／側／背／45° 正交相機 yaw、pitch=0、orthoSpan。
- `aig-real3d-native-anatomy-annotation.mjs`：使用前一階真 GPU PNG 當畫面底圖，額外用 Canvas 2D 畫**深咖啡文字、黑線標記**；四張標註圖可分別下載並得到自身 SHA。這些是「真正 GPU 背景上疊加的 2D 說明層」，不冒稱標記文字由 WebGL shader 直接產生。
- 接上原有 12 段真正的輪廓像素寬窄誤差，依來源提供之頭頂／頸根、肩／骨盆、骨盆／膝、膝／腳跟 Y 點限制區間，做**12 段的重疊行數加權誤差**，並列出正／側／背／斜四方向表格。
- 「來源標記貼合原網格」不代表真人人體來源：即使測試非人體橢圓貼上 21 個測試代碼也能通過技術 Gate，但自然頭臉／肩／手腳外型需另有可信真實人體來源、對照與人工視覺驗收。
- 這輪 **GLB 標記映射保持 BLOCK**：因目前靜態 GLB importer 會合併座標變換、縮放與節點 mesh，尚無具來源節點資訊的標記 sidecar 對應合約，不能將原始 GLB XYZ 當 OBJ 方式硬套。

## 安全與驗收
1. 所有實際人體畫面仍要求授權真人來源、SHA、四正交視角及解剖外觀比對；無來源標記時，工作區仍能提供原始咖啡色七視圖與 12 等高誤差，但**解剖區段不產生假成功數據**。
2. 沒有 SDF、Metaball、Template Morph、Subdivision 模型，不補手指、五官或肢體，不修改原始頂點；陰影、描邊與鏡頭不改原始幾何。
3. 測試以明示為**非人體**的合成原始 OBJ 網格、人工貼到原網格的 21 個測試座標、合成透明 PNG，測的是投影/下載/誤差管線，而不是自然人體。
4. 零真人外觀 PASS 自動批准；不宣稱 1:1 單張照片重建、骨架動畫或電影級人像已完成。
5. PR Draft；Render LIVE 正式首頁、RGB Mobile/Desktop Authority、CNC 3~6AX/NC、APK/EXE 不變。
