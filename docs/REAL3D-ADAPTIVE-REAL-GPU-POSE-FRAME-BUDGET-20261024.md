# Real3D 極速研發 V78｜原始 3D 姿勢真 WebGL 連續負載與自適應 FPS 排程

2026-10-24。承接已驗證 Draft PR #77 的來源全局稀疏法線、FK 雙緩衝、GPU bufferSubData 與 4 Web Workers。禁止 SDF、Metaball、Template Morph、Subdivision 重新捏出假人體，無授權真人掃描來源不可假稱天然人體 1:1 或動畫 Rig PASS。

## 本輪真實實作

新增 `aig-real3d-adaptive-pose-playback.mjs`：
- 30、60、90、120 Hz 和 Auto 工作區排程；以真 requestAnimationFrame 時間決定是否提交原始 Indexed XYZ GPU 幀，頻率會受實際顯示器刷新、瀏覽器/OS 排程與 CPU/GPU 負載限制，任何設定的 targetHz 不是觀測到的實際 FPS。
- 使用 PR #77 已計算的三節 FK 來源姿勢場景，**同一個 WebGL renderer、同一個 live Mesh 和原 original source triangle index buffer**，用 PR #76 的 `applyAIGReal3DSourceMeshDelta` / `gl.bufferSubData` 循環更新新的已知真 3D 姿勢。不是 CSS 圖片換頁，不複製四份 GPU Context，沒有重新生成幾何或宣稱連續自然人物動畫。
- 技術壓力測試使用 36 個真 rAF callback（正式分析可提升至 180）；每次記錄是否真的 draw、有多少次因 pacing/hidden/memory 阻擋、實際 WebGL frame submission wall ms、rAF 時間間隔中位數、可取得時的 Chromium heap used/limit bytes、delta subdata uploads。任何 source indexed GPU draw 不足 2,000 原 triangles 就直接 BLOCK。
- 自適應 governor 使用連續 3 次 render wall time 高於目標 frame budget 的 90% 作降級依據；Auto 累積 24 次健康影格才可逐級升至 120。少量面片及慢速設備允許實測降級；**不宣稱每個 120Hz 顯示器都能跑 120FPS**。
- 當 page visibility=hidden 時不送新 GPU draw；browser heap ratio ≥85% 逐級降頻、≥93% 暫停並待 heap ratio <76% 才恢復。Chrome `performance.memory` 並非所有瀏覽器都有，未知時回報 null，不能誤報健康。
- 常見 Web 技術無權限提供 Android／Windows CPU/GPU 溫度感測器數值；`actualDeviceTemperatureCelsius:null`、`thermalSensorAccessible:false`、`thermalProtectionCertified:false`，不以 FPS 下降推定幾度溫度或已驗證散熱。
- 此階段每次仍為真 source FK 預先採樣姿勢的**工程負載重播**，不是連續動作插值或關節骨架生理正確性認證，不是 MP4 / 60FPS 完整動畫。

## Source + Browser Gate

Node：30/60/90/120 Auto 的時序決策及升降檔、hidden 頁面強制不畫、memory 高壓暫停與恢復、未知溫度不杜撰、真正原始 Indexed XYZ GPU scene delta 的 mock renderer 回歸、無 source/GPU 工件直接 BLOCK。

Chromium：沿用 113,400 original source vertices／226,080 triangles 的完整 NONHUMAN OBJ intake、GPU 四視角、真三節來源 FK 3 張 1080×1920 GPU PNG 與 SHA，追加 36 個真 rAF callback 同一 WebGL VBO/EBO GPU 來源姿勢，至少 2 個真原始 source frame GPU draw、確實 bufferSubData、原 indexed GPU buffer reused、明確未通過 60/120 FPS / device thermals Gate。Source + Browser 必須雙 PASS 才算本輪技術驗收。

原 Render RGB HOME、AIG-II CNC、AIG Studio 5.0 CNC、FastModel 主頁、APK/EXE 與正式部署皆不改；只在 Draft PR 施工。

## 下一瓶頸

真連續長時間 30/60/90/120 FPS 要額外做 Android/Windows 裝置級 GPU/CPU、裝置溫度（受權限與硬體 API 限制）、5～30 分鐘以上長時間硬體壓力、安全降載實測；目前未完成，不可宣稱整體效能翻倍或高溫已被軟體安全管理。
