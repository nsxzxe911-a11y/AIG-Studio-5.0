# Real3D｜全身 GPU 實圖人工驗收：外觀 FAIL（2026-10-24）

來源：GitHub Actions run https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/40016255949

本輪把**已被淘汰的舊技術人體模型**輸出 GLB，交由新 Scan-Native GLB 匯入器讀入後，用 AIG 原生 WebGL 重新渲染。男、女各正面、側面、背面與斜側四視角，總計 8 張 1080×1920 原生 GPU PNG，來源 SHA、三角形及 primitive 數經測試驗證。GPU/相機/完整身體顯示管線 PASS，**人體自然外觀 FAIL**。

我已實際檢查 PNG，而不是只看 Actions PASS：
- 頭像沒有眼睛、鼻樑、口鼻、耳朵或自然臉部。
- 手部為連續塊狀，沒有獨立五指；肩、肘、腕有明顯分段或接縫。
- 雙腿、膝蓋、腳踝有截面條痕；腳掌顯得粗糙、楔形且缺乏腳趾與自然腳型。
- 側面人體粗糙，體型表面非可信解剖。
- 男女雖有軀幹比例與衣物差別，但不等於自然真實人物。
- 皮膚材質、臉、頭髮、服裝與骨架蒙皮均未達驗收。

**分開紀錄 Gate**：
- OBJ pipeline geometry and four-view screenshots: PASS (only synthetic fixture).
- GLB native static mesh import, primitive colors and four-view screenshots: PASS (only synthetic fixture).
- Existing rejected full-body GLB roundtrip 8 native GPU PNG: PASS **as technical renderer compatibility**.
- Human natural appearance / detailed face / five fingers / toes / physical identity / source authenticity / skin animation: **FAIL/BLOCK**.
- Render LIVE deployment, APK, EXE: NOT DONE. PR #48 remains Draft.

下一步必須取得可信且權利明確的完整人體三維來源，或由經授權多視角照片重建真實面部、手部、足部。再加入來源 UV/貼圖與骨架蒙皮，跑四視角比例、特徵與動態 Gate。不得再沿用以上退役人體嘗試三角形/平滑修補，也不得把成功出圖當成人體驗收。
