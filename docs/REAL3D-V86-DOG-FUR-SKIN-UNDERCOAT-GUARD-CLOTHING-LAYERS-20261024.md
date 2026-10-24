# Real3D 極速 V86｜狗的皮膚、底絨、外毛與逐件衣物

2026-10-24。接續已 Source + Chromium GPU PASS 的 Draft PR #85。本輪正式將 Geometry（形體）、Material（材質）與獨立 Wearable Mesh（穿戴物件）分層，而不是靠增加三角形捏造毛髮。

## 真實施工

aig-real3d-separate-fur-cloth-material.mjs：
- 沿用來源 original Indexed XYZ 主體，保留原 meshes、positions、normals、indices、source SHA 原樣；僅在獨立 working scene 中改 Material uniforms。
- SKIN（皮膚）、SHORT_COAT（短毛）、DOUBLE_COAT（底絨＋外護毛）、LONG_COAT（長毛表面風格），GPU LIT shader 真正渲染皮膚色、底絨色、外毛色及 roughness 差異。
- **表面材質不是立體毛絲**：本輪 0 根 individual hair fiber meshes；沒有立體毛束、外擴剪影、真毛髮動態或物理皮膚延展。不把材質視覺 PASS 冒充自然狗毛 PASS。
- 每件衣物由使用者獨立上傳原始三角 OBJ，核對來源 SHA 與身體 SHA 不同、原始頂點位置及 index 正確。每件擁有獨立 GPU Indexed Mesh／可見節點，最多四件。原始衣物頂點需和身體事先共用相同 METERS 世界座標；沒有衣物原檔，就**不會自動捏造衣服**。
- 衣物接入 GPU 並不等於已確認合身或不穿模。自動貼身、Skinning、布料物理、關節跟隨、實際碰撞、毛髮真實流向和真人／真狗完整授權掃描依然 BLOCK。

aig-real3d-fur-cloth-layer-ui.mjs：
- 只在真 OBJ 原始來源檢驗後可操作。
- 兩次真正 640×640 原生 WebGL readback PNG：同一來源主體的純皮膚 vs 毛皮材質加獨立衣物。
- GPU buffer accounting Gate：更換毛色不可重新分配原主體 VBO／EBO；若上傳一件獨立 OBJ 衣物，只允許該衣物各分配 Position／Normal／Index 共 3 個新 GL buffers。
- 產生 SHA 證據、比對真兩張圖片顏色及 byte SHA、衣物獨立來源 SHA JSON。

## Node / Chromium Gate

Source：原身體 mesh reference 和索引不變；雙層毛材質參數可追蹤；兩個衣物來源各自 Indexed Mesh、不同 SHA；沒有衣物不虛構；假的 quad、超範圍 index、相同 body SHA、非法顏色拒絕。

Chromium：沿用 V85 真曲面 NONHUMAN 網格與先前 V84 / V83 / V82 Source + GPU 回歸。新增同一 source 原皮膚 vs DOUBLE_COAT 真 GPU 640×640 PNG SHA 變更，並真正載入獨立 NONHUMAN QA 衣物 OBJ，驗證來源 SHA、兩張 original indexed triangles、獨立 +3 GL buffers 和原本主體不重新配置；下載 PNG 實際 bytes 再驗證 SHA。

所有非人體 QA 結果只代表技術 Gate。未知的狗狗身體、毛流及照片 1:1 不會從示範著色自動變成真實模型。禁止以 SDF、Metaball、Template Morph、Subdivision 程序性假人體或假狗代替。PR #86 維持 Draft 未合併未部署；Render RGB HOME、雙 CNC、APK／EXE 不動。
