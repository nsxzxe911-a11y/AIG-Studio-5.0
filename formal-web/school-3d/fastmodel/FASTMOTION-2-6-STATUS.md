# FastModel 2.6 — 圖片到動畫串接及片段一致性

更新時間：2026-10-21，Asia/Taipei。前一斷點：`FASTMOTION-2-5-STATUS.md`；可信來源為 `93e8baf6486eeb2e403be694b871a91351ecaa5b`，Push #39456926914、PR #39456933975 均成功。只在原 feature branch 向前補強。

## 本輪變更

- Python 單一入口接通既有 Phase13／15／16／17 及離線打包，從匹配規格的 PNG 真正產出蒙皮動畫 GLB、HTML、原始輸入快照、階段耗時與 SHA。
- 嚴格保留原圖／JSON／既有輸出；來源 SHA／尺寸不符會拒絕，流程失敗僅清理自己的暫存資料，不發布半成品。
- 共用 JavaScript clip selector：播放、GPU 蒙皮的姿態、掃描與 CPU 動畫檢查採用選定片段。原本將多個 clip 隱式合併的行為已移除；無效片段不取代有效 evaluator。
- 新增正式黑色 RGB「動畫」頁片段 selector、真 callback、稽核失效清除、benchmark 片段紀錄與離線打包支援。
- 詳細語言與缺口見 `IMAGE-ANIMATION-LANGUAGE-GAPS.md`。不新增冗餘語言，不把 C++ C ABI 描述為已接通的原生 renderer。

## 本機已讀證據與限制

- Python 8 項測試通過，含實際合成 PNG → 五階段 → GLB／HTML、動畫矩陣變化、來源不變、失敗不發布、輸出拒絕覆蓋。
- JavaScript clip、稽核與既有來源回歸共 137 項通過；最終 exact SHA 以本次 Actions 為準。
- 新增傳統 script 的 `vm.Script` 編譯檢查，重現並修正舊打包器在 main 中殘留 `character-face.mjs` import 的錯誤；打包時也拒絕未處理的 import／export。舊 Node 自動模組辨識檢查不能代替此項。
- Linux g++ C++20 編譯兩個既有測試 executable 並通過。此環境無 cmake，因此以相同四份 core source 直接編譯；不是 Android／Windows 建置證據。
- Playwright 套件可用但 Chromium 執行檔缺失，未完成本機瀏覽器畫面／點選驗證。離線 JS 語法檢查和 renderer 真方法的無 GPU 測試不可取代真畫面。
- 原圖未在本機取得；端到端與 CI 使用合成灰色圖片，**未宣稱正式女主角完成**。

## 未完成／續接

正式頭頸焊接、髮束穿模／透明遮擋、任意圖片完整 3D 重建、影片編碼、JNI／Windows native host、Windows／Android GPU／溫度／1080p60 均未驗收。動畫目前只支援 LINEAR rotation；不支援通道會拒絕，原模型保留。

Repo：`nsxzxe911-a11y/AIG-Studio-5.0`；branch：`feature/aig-school-3d-hero-v1-20261020`；PR #12 維持 Draft、未合併。AIG-II 本輪未修改，沒有同一組 exact SHA 的雙案 Gate，不宣稱雙案完成。正式 Render、APK／EXE 未部署。

提交後核對兩條 Actions 的 exact SHA、2.6 pipeline artifact 及原有來源 Gate。timeout 時先查 run，不重複提交。後續優先取得正式人物輸入與相同動作的視覺證據；保留 2.5 快取、RGB 骨架、材質及原始資料保護。
