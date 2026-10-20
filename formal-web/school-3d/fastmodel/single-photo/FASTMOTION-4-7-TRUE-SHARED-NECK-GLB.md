# AIG FastModel 4.7｜真正共用頂點的頭頸三角面＋技術 glTF 2.0 GLB

從可信 FastModel 4.6 `c1dfe4aa5563146064510d1ea0dd51541f8ebdb3` 向前升級。此 4.7 頁只處理「已成功校正的 4.5 來源」衍生之**工程代理頭頸**，不冒充完成正式女主角。

## 實際已寫入

- `aig-welded-4-7.mjs`：要求原有 4.6 `normalizePoseSet` 接受之 SHA／手動 2D 校正來源，先經 `buildHeadNeckPonytail` 確認舊版三件網格 Gate，再產生真正「**單一索引集合、一條共享接合環、頭頸共用頂點**」的封閉表面。
- 頭、頸間無重複封口／交疊殼。所有頭頸表面可沿索引邊連到同一個 connected component；`meshTopology` 驗證閉合、每邊配對、朝向、退化三角面、非零正體積。頸部末端保留適當下封口，頭部上端匯聚為同一頂點。
- 馬尾仍是另一個可獨立調整的三角面元件。以實際馬尾三角面**頂點**相對頸部幾何代理包絡計算可觀測最小有號間距與內部頂點數；這是保守風險掃描，**不是完整的三角面／毛髮真碰撞測試**。
- `exportAIG47GLB`：AIG 原創程式把兩個真三角面元件轉成可下載的 **合法 glTF 2.0 binary GLB**；包含 POSITION、索引、兩個 PBR 代理材質、節點、scene、bufferViews/accessors、來源 SHA 與嚴格 release BLOCK 證據。可由 Three.js GLTFLoader 回讀。沒有虛構頭髮紋理、UV、骨架、動畫或使用者臉部辨識。
- RGB UI 保留 4.6 頁的「三件各自封閉技術草模、原本 OBJ／JSON」。4.7 另外新增「建立共享頂點頭頸」「下載技術 GLB」「下載頭頸／馬尾風險 JSON」真 callback。4.6 馬尾位置、向後距離或來源更改時，4.7 舊資料立即失效，需重新生成；不得沿用不同來源 SHA 的舊 GLB。
- 使用原有畫面 canvas 預覽 4.6 或 4.7 的真 indexed meshes，重新使用原本旋轉角度，非加一張假 Authority 圖。不添加外部付費 3D 模型、Meshy 請求或光追。
- 版本 `4.7.0` 同步於 `package.json` 和 `package-lock.json`，不降級 4.6 其他功能。

## QA 狀態分層

| Gate | 可驗證方式 | 仍未知 |
|---|---|---|
| 真共享頭頸網格 | 有限邊恰好雙面配對、單連通、共同接合環頂點、正體積 | 真女主角真人頭頸貼皮、膚色紋理、接縫細節 |
| 可載入技術 GLB | binary header、JSON/BIN 緩衝區範圍、Three.js GLTFLoader 回讀 | Rig/Skin/Animation、正式人物可辨識真外觀 |
| 馬尾安全間距 | 頸部包絡與**已輸出馬尾頂點**檢測、risk 數與最小有號距離 | 髮束三角面交穿、髮根真固定、動畫時髮絲甩動穿模 |
| 照片來源一致 | 每份 4.5 calibration 綁 SHA、前視多姿態假設顯示 | 真左右／背面深度、人體運動相機標定 |
| 速度／穩定性 | Node 來源測試、單頁 RGB UI callback、離線 Web bundle | Windows／Android 實機 1080p/60FPS、GPU 高溫與真影片 |

**正式人物／影片 Gate 仍 BLOCKED**：此 GLB 是封閉的技術代理模型，不是正式女主角或動畫。還沒有真臉、全身骨架蒙皮、馬尾髮絲、真實雙人打鬥或足以宣稱 60 FPS 的硬體證據。真實女主角要求仍應以已核准圖像的實體幾何和實機各角度影片驗收。GitHub CI SUCCESS 不可等同 Render 站正式上線或 APK/EXE 發佈。

## 回歸與保護

- `tests/aig-welded-4-7.test.mjs`：原始 4.5 SHA 入庫來源、舊三件 mesh 不變、真正單連通共享接合環、兩份不同馬尾位置只修改髮尾、source-risk 標記、合法 GLB payload、GLTFLoader 實際回讀與 PNG/GLB/前版功能保持。
- GitHub 專用 4.7 Gate 會檢查最新網頁 `dist/index.html` 與 `dist/app.js` 中的真 Button ID 和功能模組，不只核對範本。
- 仍在 **AIG Studio 5.0 Draft PR #12**。未合併，不修改正式 AIG Render、AIG-II main、APK 或 EXE。
