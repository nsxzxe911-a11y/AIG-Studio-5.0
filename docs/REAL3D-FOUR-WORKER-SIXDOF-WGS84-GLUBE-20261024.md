# AIG FastModel / Real3D｜四工作通道與 6DoF 地球式空間 V1

日期：2026-10-24。承接 PR #74 真 3D 稀疏三關節原始 OBJ / SHA / GPU 分塊。這是「加速核心＋座標基礎」而不是以程式複製承諾物理 CPU 核心翻倍，也**不是**六個物理空間維度。

## 四路 CPU 工作通道，保留一個可信原始 OBJ 和 GPU

新增 `aig-real3d-quad-strain-{task,worker,pool}.mjs`：同一份來源 global Indexed XYZ 與變形後 Float32 XYZ，僅抽取原始 index 指定的真正三角面作應變量測。主執行緒預先組出緊湊來源三角面封包（每片 18 個 Float32 值：前後各 3 頂點），平分四個不同範圍，以 `ArrayBuffer` ownership transfer 傳至**真正的四個 Web Worker**；不把整份原始模型複製四份，不建立四個 GPU 繪圖 Context，更不畫四個互相矛盾的人物。

工作完成合併原始受影響 face 數、確實變動 face 數、最大原始邊長拉伸／壓縮、翻面與塌陷。直接以同一封包單線程完整重算比對，任何差異就 throw BLOCK。各 worker 完成即 terminate，不佔長期背景工作。

實際產品模式自適應：
- 工作負載小於 64 face、無 Worker 或硬體明示少於 4 執行緒時，優先走原序列單線程，避免 Worker 啟動成本把工作拖慢。
- 具備 Worker 及足夠大工作量時啟動 4 個真正的 Worker 工作通道（作業系統實際有多少 CPU 實體核心**無法保證**）。
- Chromium CI 強制 4 Worker 做 8,192 片獨立非人體 triangle 的真來源前後座標計算，紀錄實際 serial / 4 worker 壁鐘時間及數值完全一致、Worker 真數=4。
- 效能不會因 2 → 4 個工作通道而保證兩倍；工作切割、打包成本、核心數、熱與記憶體頻寬皆可能限制，而且 GPU 仍是單一渲染入口。沒有機器實測可證明效能翻倍之前，`twoTimesFasterClaimSupported:false`。

Real3D 三節 FK 工作區沿用可信來源 SHA 和現有 GPU，新增對最後一幀真原始變形的分區四路應變診斷／單線程對照；若不相同，BLOCK。保留原始 OBJ 所有全球 index 和三角面，不使用 SDF、Metaball、Template Morph 或 Subdivision 去做假外型。

## 6DoF 與球面／地球座標

**6DoF = 局部 XYZ（3 位移）＋Yaw/Pitch/Roll（3 旋轉）**。不是新增六個需要顯示的物理空間維度，也不直接把 CNC Fanuc 的 A/B/C 軸定義強行視為 Yaw/Pitch/Roll；機構軸映射必須獨立校準。

新增 `aig-sixdof-geoglobe-space.mjs`：
- WGS84 geodetic (latitude, longitude, ellipsoid height) ↔ 地心地固 ECEF（單位 m，雙精度）。
- 建立明確 anchor，局部 East/North/Up 在 CPU 按 mm 雙精度往返 global ECEF，先處理 floating origin，不能將地球表面約 6,000,000m 的絕對座標直接丟到浮點 32 位 GPU 導致 0.001mm 精度消失。
- ZYX 順序的 Yaw/Pitch/Roll 單位 quaternion、旋轉原始 XYZ 工具點、局部球面相機環繞座標。
- 手動輸入地球 anchor、X/Y/Z 毫米和三旋轉角的真 Lab 按鈕，可顯示 WGS84 ↔ ENU 往返誤差與經緯線球形**概念示意**。不是地球貼圖、3D 地形串流或實際導航，也不會要求使用者目前位置。

跨 AIG-II、AIG Studio 5.0、FastModel 共用座標數學是一項架構基礎；正式 CNC 0.001mm 末端加工安全、六軸機構碰撞、機台原點、實際 Earth 全球場景和 Android/Windows FPS 仍需原硬體驗收。新模組保持 Draft 隔離，不修改正式 Render RGB HOME／CNC／APK／EXE。

## 驗收與不通過界線

Node：四份 source triangle 封包切割的應變與單線程逐項一致；無原來源/錯 offset/index 必須 BLOCK；不存在 Worker 的 Node 環境應顯示真實 serial fallback。WGS84 赤道/高緯度/雙精度往返、局部 0.001mm 偏移、六自由度 90° yaw、小球面環繞視角，錯輸入 FAIL CLOSED。

Chromium：新增 **真 4 個 Web Worker** 執行具體的 8,192 face NONHUMAN 三角面真數學、原生 source 串列基準完全一致，及六自由度球面工作區按鈕實際計算、原本原生 1080×1920 高密度 GPU QA 全部必須 PASS。測試結果只屬**數值與技術 Gate**，真實自然人體掃描、照片一比一、動畫骨架 60/120 FPS、手機/桌面跨裝置「效能翻倍」、正式 6AX 機台控制全部 BLOCK。
