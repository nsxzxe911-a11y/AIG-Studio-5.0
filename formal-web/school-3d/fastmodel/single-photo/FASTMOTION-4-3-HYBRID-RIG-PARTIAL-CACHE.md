# AIG FastModel 4.3 — 自研 Hybrid Native：骨架先行、局部 Mesh 快取、SDF 即時姿態

## 預設永久政策
**AIG 自研與零生成點數**。不依賴 Meshy、Stable Fast 3D 或外部生成服務／雲端模型權重；不因失敗暗中改向第三方。保留 4.0 來源圖片 SHA、4.0 真實技術 GLB、4.1 SDF、4.2 非阻塞 GPU 計時、畫質降載與本機隔離工作程序。

## 4.3 已實作的實際程式（Draft）
- `aig-hybrid-4-3.mjs` `createRig(scaffold)`：只接受 4.0 驗證過的 `sourceSHA256` 和 11 段相對 2D 輪廓，建立可配置的四肢**推估**骨節長度與肩／骨盆半徑。真正人體特徵識別尚未完成，`sourceLandmarksVerified:false`。
- `Aig43RigController`：可單獨改 `leftArm`、`rightArm`、`leftLeg`、`rightLeg`，限制角度 ±55°，每一部位獨立版本號；角度不變不無謂增加 revision。姿態由兩節連續 capsule（肩→肘→腕、骨盆→膝→踝）計算，不允許一節改動斷開另節。
- `Aig43PatchCache`：用來源 SHA＋部位 ID＋其自身 revision 作 cache key。只在部位真的變動時重新生成**該部位 2 段低面數封口 Mesh**；未變部位沿用同一記憶體物件，跨來源時清空舊 cache。此 cache 是技術網格草模，**沒有生成完整蒙皮 humanoid GLB**。
- `aig-sdf-4-1.mjs`：延續原 shader 與程序化渲染，增加 `uArmJoints[4]`、`uLegJoints[4]` 和 `uRigEnabled`；手動姿態只更新 WebGL uniforms，不重建全畫面 buffer/shader，也不每次重新輸出 GLB。原 4.1 沒有姿態時的 static geometry 保留。
- `app.mjs`、`index.html`：正式繁中 RGB SDF 面板加入部位選擇、角度滑桿、還原部位鍵與 cache 命中資訊。來源／SDF context 釋放時，關閉控件並清除只屬於技術預覽的 cache，原始來源、4.0 GLB、其他已驗證模組均不刪除。

## 絕對不夸大
1. 骨架目前是有界幾何 **technical pose guide**，不是由照片真正辨識出的 3D joints。肩、髖與四肢長度只是啟發式比例，不可宣稱本人骨骼相符。
2. SDF 圖像與局部 mesh 的表面均為 3D 草模，手指／臉／獨立髮束／裙擺接合、cloth simulation／真自動 Rig／權重／精密 IK／pose 髮膚碰撞**未完成**。
3. 不宣稱本版本已在 S23／Windows GPU 跑到 60/120 FPS 或 UI 零掉幀。4.2 的 GPU query 與 hysteresis code Gate PASS 不等於現場效能 PASS。
4. 只有來源／函式／模擬 WebGL2 mock 測試通過才能稱為 Source Gate PASS；未做真人女主角的特徵量測與影片輸出。

## 4.3 正式 Gate 分層
- **Native zero credits:** JS 幾何程式不執行 network／付費推論；既有付費 server 入口預設 `ZERO_CREDITS_REMOTE_3D_BLOCKED`。
- **Provenance:** 確切 4.0 原圖 SHA、比例欄位必須符合契約；來源變更禁止沿用另一個人物的 mesh cache。
- **Limb continuity:** 肘、膝的上／下 capsule 必須共用端點；角度限位，無效與 NaN 一律 BLOCK。
- **GPU delta:** 單一部位更新改 uniforms 而不是重建 GPU shader 或重新上傳 4.0 全身 GLB；GPU context lost 時恢復安全預覽、保留來源與成功成果。
- **Cache:** 左手變更不重算其他三肢 Mesh；命中／miss 與每塊 mesh revision 可測。
- **Material and Release:** 4.0 Mesh 最終輸出可繼續使用，但局部 preview cache 無法假冒帶 `skinWeights` 的高模；正式女主角及電影 Gate 仍 BLOCK。

## 下一個實際工作（4.4）
加入頭／頸／髮束分段與可驗證 pose 範圍、局部貼圖 UV 和簡單布料避讓，再研發真正的 source-driven body landmark estimator。支持硬體 GPU P50/P95 測量並分別驗收 Android/Windows 的實際影片，才有資格升正式發佈。
