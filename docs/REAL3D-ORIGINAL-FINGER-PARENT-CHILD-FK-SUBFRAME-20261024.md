# Real3D｜來源原生父子關節 FK＋中間時間取樣 Gate V1

日期 2026-10-24。承接 #71 的**兩根不同手指、獨立權重**時間序列；本階改為**同一根手指的 Base 父關節 → Middle 子關節**繼承層級。仍不合併／不部署 AIG Render 正式 RGB 首頁、CNC 主控、APK/EXE；不使用 SDF、Metaball、Template Morph、Subdivision 假人體。

## 真正的幾何增量

新增來源 SHA 綁定的本機 JSON schema：
`AIG_REAL3D_EXPLICIT_FINGER_HIERARCHY_WEIGHTS_V1`。
需要 sourceSha256、sourceVertexCount、side、finger，parent=Base 與 child=Middle，各自附來源 raw XYZ 旋轉中心、世界旋轉軸與**原始全球頂點 index 明確權重**。需沿用先前本機 47 點來源解剖標記 JSON；Base/Middle 必須貼合真來源頂點，且兩關節旋轉中心不得重疊。遠端權重只能作用在已有父端權重的頂點，避免出現沒有支撐關聯的假骨架；不會自動編造缺少的骨架與體表。

每一時點先計算 Base 來源三角面頂點加權旋轉，同時用 Base 完整變換搬動 Middle 子關節中心和旋轉軸，再計算 Middle 局部加權旋轉；與前版 PR #71 的兩個**互不相干**的關節有本質差異。輸出 Float32Array 真三維 XYZ 工作副本，不改原始 OBJ／Uint32 GLOBAL 面片索引，GPU 分塊接縫不視為人體裂縫。

- 工作區可設定 Base/Middle 各 ±45°。三張 1080×1920 原生 GPU 影格提供 0%、中途與最終姿勢，同時每段增加中間檢查點（例如 24°，最大步幅 8° → 至少四個時間取樣）；JSON 記錄每一子幀的子關節中心、原始變形頂點數、原面片數及角度。
- 每一子幀量測原始三角面最大邊拉伸／壓縮、翻面與塌陷；把來源 parent-only / child 影響三角面送入 PR #71 已驗證的 3D AABB + 非共面相交檢查。超出 120k 配對預算必須報 INCOMPLETE，不可宣稱安全。
- **碰撞取樣不等於連續無碰撞證明**。跨幀穿透、共面或貼近接觸、全身手臂、真皮膚形變、手指生理約束仍待下階。即使報表沒有穿插、GPU 實際可顯示，也不代表自然真人骨架驗證完成或 60 FPS 達標。
- 非破壞性本機輸出每幀 GPU PNG/SHA、來源綁定 JSON。原始資料與技術測試件不得冒稱已驗證人體。

## 驗收規則

Node：NONHUMAN 原始立方體驗證靜止幀、父關節移動子關節中心、子關節獨立時中心不動、每影格真頂點變形、真 GPU 原始面片數完全保留；錯 SHA／錯來源 joint pivot／缺標記／沒有父端繼承的 child 權重／超角度／不合法時間步長都 BLOCK。

Chromium：同一份 113,400 頂點／226,080 三角面 NONHUMAN 高密度 OBJ，額外輸入真正屬於原始來源不同頂點的 Base/Middle 座標及其全球 index 權重，實際產生三張 1080×1920 真 GPU PNG、比較下載 PNG SHA、驗證遠端中心會隨父關節旋轉且原面片數不變。所有 `skinMotionNaturalnessPASS`, `animationRigPASS`, `releasePASS` 均維持 false，待真實授權人體來源與自然度審核。
