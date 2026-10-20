# AIG FastModel 4.2 — 零點數「不卡頓」3D 生成／渲染分離

**本輪真正程式**：`aig-performance-4-2.mjs`、`aig-sdf-4-1.mjs`、`aig_native4_jobs.py`、`app.mjs`、`index.html`、`tests/aig-performance-4-2.test.mjs`。
所有改動只在 Draft PR #12 的 `feature/aig-school-3d-hero-v1-20261020`；正式網站、手機 APK、Windows EXE 都未部署。本輪零付費 API、零外部推論引擎／權重。通用 WebGL2、Python、Pillow 等語言／基礎程式庫授權各自保留。

## 真正要解決的卡頓，應分成三層

1. **CPU 生成阻塞**：4.0 的 Python 主程序中的 CPU-bound 工作本身會與本機 HTTP 競爭 GIL；4.2 改為**本機獨立 subprocess** 執行 AIG 原創的 `aig_native4.py`（仍是本機、不是第三方服務）。一次只計算一個，最多另外保留一個等待，超額回 `AIG42_COMPUTE_BUSY_RETRY_LATER`。產物 SHA 與原圖重新核對後才設 `COMPLETE`。獨立進程不是「計算瞬間完成」，而是降低網站操作被重建工作鎖住的風險。停電／中斷時仍需恢復／另起工作，不假稱已產完。
2. **GPU 每畫面過量像素**：4.1 WebGL2 SDF fragment 以前每個像素最多 96 次完整場距離判斷。4.2 加一個包圍角色的保守球體射線進入／離開檢查，不可能打到角色的像素直接輸出背景，跳過昂貴 SDF；角色範圍內仍以真 SDF 迭代。控制畫質只用 `renderer.configure()` 改解析度／步數，不反覆重新建立 shader／buffer。
3. **手指滑動觸發過多重畫**：`Aig42FrameCoalescer` 把同一個 rAF 排程內的觸控／滑桿事件壓成最後一次有效角度，最多提交一幀。停止／更換原圖時取消尚未送出的任務、釋放 GPU program 和 buffer，並保存來源與 4.0 真 GLB。

## 比單純網格／SDF 更快的實際方案

- 最適合 **外型編輯**：SDF／骨架 capsule，少量參數，不必每次都重新 triangulate 4.0 GLB。
- 最適合 **已完成模型的連續播放**：**一次建立／快取的低面數 Mesh（4.0 GLB）**，不應以高採樣 SDF 每幀重算全畫面。當 SDF 自動降到最低還超過 GPU 工作預算，UI 指示切回既有 GLB；不擅自覆蓋目前的模型。
- 最適合 **真正生成完整人體高品質 mesh**：分區漸進重建、LOD、背景工作執行、可取消、採樣結果快取；目前仍待 4.3 專案驗證，不能把本輪 SDF mannequin 算作已還原頭髮／五官／裙擺。

## 非阻塞計時、升降載安全

`Aig42GpuTimer` 僅使用 WebGL2 `EXT_disjoint_timer_query_webgl2` 的 query begin/end；`poll()` 檢查 `QUERY_RESULT_AVAILABLE`，不呼叫 `gl.finish()`、`readPixels()` 或忙等；測量發生 `GPU_DISJOINT` 就丟棄。無擴充功能時仍可手動畫質，不冒充有 GPU 數據。

`Aig42Governor` 只接受真正、非 disjoint 的 `gpuMs`，預算預設 12ms（預覽工作額度，**不等於 60FPS**）：
- safe `0.35× / 24步`；fast `0.50× / 36步`；balanced `0.70× / 56步`；quality `1.0× / 88步`。
- 多次超預算才降一級；多次低於預算才升級，設有 cooldown 抑制反覆升降。
- 單次延遲 JS 提交 `ms` 不可視為 GPU 繪製完畢、VSync 顯示速度或 Windows／Android FPS。
- 沒有計時擴充的設備保持 fast；不偷偷進入高負載 quality。
- 此策略按交互時才排程，不會啟動無限持續 redraw。實際需要 60Hz 連續動畫時還要另行量測 draw-to-present 和 GPU/CPU 壓力。

## Release Gate

- **保留已驗證功能**：4.0 source SHA、eight views、GLB 保存與下載、4.1 head-neck signed-distance continuity，3.9 禁止外部點數、其他 AIG CAD/CAM/NC 內容不改。
- **新增來源 Gate**：`tests/aig-performance-4-2.test.mjs` 驗證濾掉無效 GPU timer 样本、降載／升載遲滯、150 次滑桿輸入只執行一次畫面工作、釋放後不重畫、timer 沒有同步 GPU stalls、以及 backend 隔離／上下游 callback contract。舊 `tests/aig-sdf-4-1.test.mjs` 同步保留不宣稱 FPS 的檢查。
- **人物品質未驗證**：4.2 仍是 4.1 的分析式人體草模；原圖看不到的背面、真髮束、皮膚、關節動畫、發佈級 GLB 尚未完成。
- **現場驗收未完成**：Windows/Android 實機 GPU P50/P95/P99、掉幀率、發熱、RAM、S23 60/120Hz、視覺精準度與真 1080p 動畫影片**尚未實測**，不得宣稱已達 60fps／100% 不卡頓。

## 下一個真有用的 4.3
自研分部位 capsule/SDF 結合相機比例對齊，快取每個被確認的部位網格；平移/旋轉時僅更新骨架參數，而不是重新產生全身網格；背景工作支援取消和局部 checkpoint。嚴禁把原始單圖無法證明的後背／頭髮／四肢解剖當已知。
