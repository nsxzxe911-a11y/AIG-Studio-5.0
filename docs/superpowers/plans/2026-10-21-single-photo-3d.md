# FastModel 2.7 Implementation Plan

> For agentic workers: use superpowers:executing-plans for inline execution; review the completed change independently.

**Goal:** 新增一次選圖即可接續真重建、骨架、動作、PBR 預覽與 GLB 輸出的流程。
**Architecture:** Python 保留來源與任務 journal，依官方 API 串接；本機 HTTP UI 僅傳圖片與工作 ID，金鑰在服務端。Three.js viewer 與既有 renderer 隔離，兼容真外部 GLB。
**Tech Stack:** Python stdlib/Pillow、Three.js 0.180.0、esbuild 0.25.12、Node tests。
**Spec:** docs/superpowers/specs/2026-10-21-single-photo-3d.md

## Global Constraints

- 由 d3435ecb 向前，PR #12 Draft，2.6 不回退。
- 沒有服務憑證即阻擋真雲端生成，不宣稱合成 fixture 為真照片重建。
- 原圖、成功階段、既有模型不覆蓋；POST 受理未知不重送。
- 真照片背面為估計，releaseAllowed=false。

## Review Focus

- 計費 POST timeout 後重啟：不得重送。
- 下載失敗或生成後綁骨架失敗：保留完成的模型與 task ID。
- 未設金鑰、HTTP 401/402/429：狀態清楚，無假結果。
- 普通物件與人物的不同能力：相機環繞不可充當骨架動畫。
- 不合法 GLB／外部 asset URL／來源異動：拒絕，原工作區保留。

### Task 1: 真重建任務與續接

- [x] 先寫 tests/test_pipeline.py，測真 HTTP fixture 的三段鏈路、來源保存、未知 POST 不重送與錯誤 GLB。
- [x] 跑 unittest 觀察缺少 pipeline 失敗。
- [x] 實作 provider.py、pipeline.py、GLB structural audit 與 CLI；新工作目錄與 journal 原子替換。
- [x] 跑測試，確認來源 SHA 不變、各段 task ID 可續接。

### Task 2: 相容預覽與一鍵入口

- [x] 先測 GLTFLoader/AnimationMixer 的真動畫及普通模型。
- [x] 實作 viewer.mjs、app.mjs、index.html、本機 server.py 及離線包。
- [x] 固定 npm lock；只打包程式庫，不含任何第三方角色。
- [x] 驗證 HTTP callbacks、無金鑰訊息與新工作 ID；瀏覽器安裝失敗，畫面驗收另列未完成。

### Task 3: GitHub 證據

- [x] 舊 Node/Python 回歸與新測試全部通過，更新 CI 加合成產物。
- [x] 獨立審查並修正實際問題。
- [ ] 提交原 feature branch，核對 exact SHA Push/PR Actions 及 artifact。
- [ ] 更新續接紀錄，明列缺少真服務帳戶及真照片品質／實機驗收。
