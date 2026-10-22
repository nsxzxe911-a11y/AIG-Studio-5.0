# AIG 原網站／三案：防塞車、防假按鈕、防偽動畫、離線／長期停工保護

決議日期：2026-10-22。適用 AIG-II、AIG Studio 5.0、AIG FastModel。這是分階段 Gate，不是整站所有功能已修復的聲明。

## 使用者目標（不要求學 GitHub 或 Render）
- 網站作為真實編譯、功能驗證、下載與修復入口，不要求使用者輸入金鑰、修改 YAML 或重複手動操作才能相信品質。
- 不因斷線、塞車、GitHub Actions quota、Render 睡眠/重啟、久未使用，抹除上次可用 CAD/CAM/NC/動畫核心或切回工程殼。
- 中英文翻譯只改 UI 字串，PageID、ButtonID、CommandID、callback、資料來源與可執行語意不可被翻譯器改寫。
- 無真 engine 產出即 BLOCKED；按鈕可點≠功能 PASS，畫面有動畫≠3D 蒙皮頂點動作或 CNC 真材料移除。

## 已寫入來源的控制（需分開看測試和正式 Render 部署）
1. GitHub runner 編譯安卓 APK 及 Windows PE/MZ EXE，網站不聲稱自己把語法「翻譯」為 EXE。
2. 建置輸入白名單：AIG-II 和 Studio 固定修復分支；操作需要 server-side auth；無授權時不能發出虛假建置。
3. 每次 build 有獨立 `aig_request_id`，GitHub Actions run-name 含相同 ID。回報必須以 request ID + exact Git SHA + branch 對齊，禁止借用同 branch 另一輪測試的綠燈。
4. 來源工作超過 300 秒無有效 GitHub run → BLOCKED；活躍工作超過四小時沒結論 → BLOCKED，僅表示無證據可用，不聲稱原工作自動停止；不可畫假的 100%。
5. 如果 GitHub 已有同 branch 的 queued/in_progress 作業，不再重複觸發會取消前一個作業的工作流程。
6. GH workflow `success` 仍須同時找到 Android 和 Windows 確實存在且大小非零的 artifact 才啟用 QA ZIP。QA != production release, SHA 檢查與簽章仍需各自驗收。
7. 雙語頁面的控制 ID 和真 click callback、相同 locale keys、沒有以 HTML 注入翻譯、未出現無條件 PASS assert，由 `infra/aig-site-builder/verify_ui_contract.py` 在 CI 檢查。
8. 原網站 RGB、CAD/CAM/NC、FastModel working copy 不得被「修復入口」覆蓋、初始化、刪除。

## 目前未完成 — Gate 必須保持 BLOCKED
- Render 本輪 LIVE 仍是先前提交：網站 `3f02f20d...`、remote bridge `9e7591a5...`，**新增的防塞車與工作識別改進雖有 GitHub 測試 PASS，尚未證明新程式已在 Render LIVE**。
- 網站管理端的 GitHub Actions 憑證尚未證實配置；網站一鍵編譯→真 APK/EXE→網站下載整條鏈路未實際完成過。
- 現有 builder queue 是記憶體，Render 重啟後本頁的暫時工作 ID 會失效；真 GitHub 工作仍可能繼續。需外部 durable build ledger（DB/物件儲存）與啟動後重新附掛已存在工作。
- Signed APK/EXE 持久發行庫、不可變版本 tags、保護分支、Release digest/readback/保留策略仍需設計。Git SHA 能驗出版本不同，但不能在帳戶遭盜用時自行阻止惡意提交。
- CAD/CAM/SIM/3~6AX/NC/AI 和 FastModel 正式 Runtime 的**逐頁真 callback + 結果 UI + 實際照片/影片/數值數據**全部通過才可稱 NO_FAKE_RUNTIME_PASS。僅新增 Builder UI gate 不是十頁真功能驗收。
- 多類別識別、真 SDF/meshless 物理、6AX 機台輸出與真簽章皆未驗證不可藉翻譯或版本號冒充完成。

## 下一輪不破壞性工作
1. 修好真正網站的 Render commit 自動發布可觀測性（必須看到最新 commit LIVE 才可宣稱上線），以滾動更新和來源 SHA 比對避免誤部署。
2. Durable build queue/ledger、精確 SHA + 簽章與改版 history；允許長期斷線後查詢 GitHub 真實 jobs，不憑網頁動畫判定。
3. 十頁 RGB 正式 runtime action ledger：固定 PageID/ButtonID/CommandID → Core handler → actual output type/sha；離線、回退、多語切換、長期沒操作、資料更新後重新載入的負向測試。
4. 真 G-code/刀路/材料移除、GLB 頂點蒙皮/影格與 3D 碰撞證據附於該功能 Gate；缺證據顯示 BLOCKED。
5. 經獨立 Android/Windows 原生 Gate、簽章、實際啟動及安裝/解除安裝之後才開放正式下載；其餘只顯示 QA/未交付。

**政策：不要要求不熟悉開發工具的 AIG 使用者自行修 token、選分支或判斷工程殼真假。工具鏈和證據應由系統自動執行；沒有權限或缺依賴即如實停用。**

## 2026-10-22 AI 跨對話接續 V1｜實際新增的來源，不代表已部署
- 已新增 `formal-web/ai-resume.html`、`web/ai-resume.html` 與各自的 `ai-resume-manifest.json`，並在兩個首頁加入「AI 斷線接續」。
- 交接快照含 AIG-II、AIG Studio 5.0 與 FastModel 三專案。來源 SHA、真正 Runtime、Render LIVE、APK/EXE 各自獨立顯示。FastModel 的正式來源路徑未查證，因此保持 NOT_VERIFIED。
- 頁面可複製新對話交接指令、下載 JSON，並嘗試向 GitHub 公開 API 檢查 Studio 修復分支來源是否過期；私人 AIG-II 不能由匿名瀏覽器核對。
- 來源檔比對與格式檢查 `AIG_AI_HANDOFF_SOURCE_GATE_PASS`；**網站部署、每輪自動回寫、持久後端佇列、原生功能驗收依舊未完成**，不可從 Source PASS 推論 Live PASS。
- 往後新增可信斷點時，應更新兩套 JSON，附差異 SHA 與回歸證據，不得只更新對話文字或更換版本號。
- 施工細則見 `docs/AIG_AI_CONTINUITY_HANDOFF_V1_20261022.md` 與 `ci/verify_ai_continuity_source.py`。
