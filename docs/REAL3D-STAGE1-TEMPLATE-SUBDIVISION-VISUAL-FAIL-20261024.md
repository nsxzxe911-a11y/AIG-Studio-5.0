# Real3D「下一種」Template Morph／Subdivision 真實驗收紀錄（2026-10-24）

## 使用者要求
對 SDF 與 Metaball 的實際網站正面人體（無臉、頭肩軀幹與腳球化）正式說「淘汰～下一個」。禁止把這兩者再拿回去做正式人體。

## 真實施作
Draft PR #47: https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/pull/47
實作新的 `aig-real3d-anatomical-template-morph.mjs`，不是 SDF/Metaball 改名。
使用單一前後閉合的 3D 人體輪廓控制籠（頭髮未建、無臉部真掃描），明確控制點建模肩／頸／頭／手掌外形／腰／骨盆／雙腿／足底，提供真實身高/體型參數變形。
兩條路徑：Template Morph（11,776 triangles）和 Subdivision（84,992 triangles），男女來源皆 1 connected component、0 non-manifold edges、0 open edges；有真共享 WebGL＋19200 邏輯槽 CPU Worker，不是另加 GPU 19,200 實體核心。

## 真 Chromium WebGL 截圖
GitHub Actions `39994787308` 兩個 Jobs 成功；artifact `12519307745`：四張獨立 SHA 的原生 1080×1920 PNG 與畫廊 HTML 真網頁截圖。這僅代表「真像素產生且拓樸數值通過」，**不是人體自然外觀 PASS**。
人工檢查四張實圖：仍有過長無臉頭部、頭頂條痕、胸腰像一整塊平板、手臂很細、肩胸不自然、足部缺少趾形、男女 silhouette 仍過度相似；Subdivision 只是把低模補細，不是恢復正常人體解剖比例。

**正式 Stage1 人體外觀依然 FAIL/BLOCK**，本候選不可升格正式 RGB 人像，也未部署到 AIG 新首頁。SDF／Metaball 退役連結另已從 AIG 正式首頁主要入口撤下，直接歷史 URL 仍保留供核對，正式 CNC / 3AX / 手機 / AI 頁不受影響。

## 繼續前必須改變的做法
不要再僅靠抽象對稱曲線／簡化 SDF／Blob，這三種都證明「拓樸正確≠真實人體」。下個合適來源為可驗證出處的**真正人體完整基底模板**（明確 3D 頭頸肩胸手掌腳掌和完整側面截面）或直接使用經授權的真人多視角源圖進行重建；必須保留原始來源、比例測量、單一 skin mesh，可用 Morph/骨架調整。沒有合法／真實模板來源，就先 BLOCK，而不是繼續製造更精細的假人。
