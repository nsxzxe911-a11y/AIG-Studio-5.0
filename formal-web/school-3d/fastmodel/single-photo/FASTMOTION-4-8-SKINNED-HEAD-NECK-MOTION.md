# AIG FastModel 4.8｜真正骨架蒙皮／三個 GLB 技術動作／15 姿態實測

來源：只從 4.7 的 SHA-bound `buildAIG47Draft`、單張共享索引頭頸殼和獨立馬尾殼向前擴展。既有 4.5 → 4.7、劇情 3.2、台詞／聲音 3.3、影片 3.4 等保留，不回退、不覆寫原始來源。**這個 PR 仍是 Draft，非正式網站部署。**

## 實際新增

- `aig-skin-motion-4-8.mjs`：從原始 4.7 網格創造每個頂點有 4 組 JOINTS_0/WEIGHTS_0 的真 glTF 2.0 Skin。具備 Root、Neck、Head、PonytailRoot、PonytailTip 五個階層骨骼與各自 inverse-bind MAT4。頭頸繼續用同一個已封閉的 indexed triangle mesh（不是兩個套在一起的頭與脖子）。
- 三個有實際節點 quaternion 旋轉關鍵影格的技術動畫：`AIG48_TURN_HEAD`、`AIG48_NOD_HEAD`、`AIG48_SWING_PONYTAIL`。所有轉角固定在相對溫和幅度；不代表醫療級／人體真實活動角限制。馬尾使用皮膚權重與節點變形，**沒有毛髮物理解算或真正的髮絲碰撞**。
- 真 binary GLB 轉換並使用 Three.js `GLTFLoader` 回讀；透過 `AnimationMixer` 對每個 clip 的 0、0.5、1、1.5、2 秒採樣，合計 15 個技術姿態；逐頂點計算實際位移、NaN/Infinite 與每個三角面的面積。所有動作須有非零位移且每個採樣面有正面積，否則 BLOCK。
- RGB 網頁單獨增加 Button ID `aig48-build`、`aig48-download`、`aig48-evidence`、狀態欄。使用者可以下載有 SKIN 和 animations 的技術 GLB，在既有本機 GLB Viewer 重新載入與播放；下載的 15 姿態 JSON 包含來源 SHA、骨骼名稱、每段 clip 實際變形量與 QA 限制。
- 來源或 4.7 馬尾設定改變會失效化 4.8；4.8 QA 異步進行時被換來源，不能沿用舊結果。舊版 4.7 未蒙皮 GLB 功能保留。版本升至 `4.8.0`。

## Gate 邊界

| 可由程式碼／技術 GLB 驗證 | 不能宣稱 |
|---|---|
| HEAD+NECK 同一個索引網格，骨架權重合法，無資料 NaN | 外觀與核准女主角的照片完全一致 |
| 動畫確實令實際 3D SkinnedMesh 頂點改變，沒有採樣三角面積歸零 | 真實皮膚接合與細節無撕裂／每一時刻無穿模 |
| GLTFLoader/AnimationMixer 真正載入／播放三組骨骼通道 | 馬尾髮束物理碰撞、頭髮和頸部精確三角相交檢測 |
| 來源 SHA 綁定、舊功能不被新版覆蓋 | 完整人體 Rig、實際打鬥角色動作、真實配音影片的最終視覺品質 |
| Push/PR GitHub Actions 可核對的來源 Gate | Render LIVE 網站、Android APK、Windows EXE、實機 60 FPS／GPU 溫度 |

QA 仍屬 **DRAFT technical, releaseAllowed:false**；Source PASS 只能在指定 commit 的 GitHub Actions 完成後標記。真正女主角的臉型及完整人體、透明髮束、實際可播放的有聲 1080p 影片、Windows／Android 每裝置 FPS／溫度是獨立未完成 Gate。

## 本輪測試

- `tests/aig-skin-motion-4-8.test.mjs`：4.5 SHA→4.7 原始 mesh 與 4.7 GLB 不變、五關節 4 權重歸一化、原始 GLB 以 GLTFLoader 真的載回兩個 SkinnedMesh、三個 clips、實際 AnimationMixer 變形與最小三角面積、4.8 Button ID 與先前影片／劇情路徑保留。
- `npm test`／`npm run build` 以及 exact-HEAD GitHub Actions source Gate 必須另外逐項檢查，不以 README 作通過證據。
