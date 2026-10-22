# AIG 原網站｜真實 APK + Windows EXE 編譯中心

**2026-10-22｜來源已接通、雲端部署已建立；GitHub workflow 授權仍需管理員設定。**

## 真正的運作路徑

1. 使用者進入原網站 `https://aig-dual-formal-runtime.onrender.com/cloud-builder.html`。
2. 頁面讀取既有 Render `https://aig-remote-bridge.onrender.com/builder/api/health` 的實際配置狀態。
3. 授權管理者以暫存於網頁記憶體中的管理金鑰按下 **真正編譯 APK＋EXE**。
4. Remote Bridge 新增子應用驗證 Bearer token、固定專案及 Git ref、取得 GitHub 原始碼 **SHA-40**，呼叫 GitHub REST `workflow_dispatch` 執行兩案已存在的 `.github/workflows/build-download.yml`。
5. GitHub Actions 的 Ubuntu runner 建立、驗證 Android APK；Windows 2025 runner 執行 `build_windows_native.ps1` 產生真正 PE/MZ EXE，並跑各自 Release Gate。
6. 網頁輪詢真正的 workflow status/結論（不可用假的百分比）；只在 **同一個提交 SHA 和分支、整個工作流程 SUCCESS、Android 與 EXE 附件都有非零 bytes** 時開放短期 GitHub ZIP 下載。
7. 後端串流 ZIP，不把 GitHub API token 洩漏到瀏覽器；未滿 Gate、GitHub Artifact quota 滿、登入失敗或下載逾期，都 BLOCKED。

## 尚待啟用的 Render 管理員密鑰

Render 既有服務：`aig-remote-bridge`，**不用新建服務**，因帳戶已達 25 服務上限。

進入 Render Dashboard 的 [既有 AIG Remote Bridge](https://dashboard.render.com/web/srv-db85140m7kps73d3fujg) → **Environment** → 設以下兩個值（不得在網頁原始碼、聊天、Git repo 或前端 localStorage 中保存）：

- `AIG_BUILDER_ADMIN_TOKEN`：管理者自己產生、足夠長度的隨機字串（建議 32 bytes 以上）。訪問網站時輸入此值，瀏覽器在本頁生命週期內暫存，不寫入網站儲存區。
- `AIG_BUILDER_GITHUB_TOKEN`：GitHub 對 **AIG-II 與 AIG-Studio-5.0 兩個 repo** 具有必要 Actions workflow dispatch、檢視 runs/下載 artifact 及讀取來源 commit 的細粒度權限 token（遵循最小權限原則）。不要將 token 貼給 AI。

此兩個 token 沒有配置時，`/builder/api/health` 回 `BLOCKED_NOT_CONFIGURED`，按鈕 disabled；不應宣稱已能遠端按鍵編譯。

## UI 翻譯與真執行

繁中／English 翻譯為真正的字串字典映射到 DOM，包括工程名稱、提示、操作、執行狀態與下載鈕。切換語言不會偽造可執行能力；不能把翻譯 UI 當作 G-code、Java 或 Kotlin 編譯器。

## 已實際完成之部分

- GitHub Builder API source `infra/aig-remote-bridge/aig_site_builder.py`（位於 `infra/aig-remote-bridge-20261015` 分支）；原 Agent API 不變，ASGI 子程式 mount 在 `/builder`。
- 原網站 UI source `formal-web/cloud-builder.html`（位於 `web/aig-dual-formal-runtime-20261016` 分支）。
- Repo 內 `infra/aig-site-builder/app.py` 是一致 API 的測試副本；**真正 Render 服務使用上述 remote bridge 分支**。
- GitHub unit tests cover unknown commands, authorization, workflow_dispatch source SHA, Windows EXE artifact missing BLOCK, source SHA mismatch.
- 本輪 Render 服務額度已滿，因此不刪既有服務，而是沿用既有 Remote Bridge。

## 尚未完成，不得假報

- **兩個 Render 環境金鑰**：目前未由使用者管理員配置，因此不能真正派送 GitHub 工作流程。
- **網站觸發的真 APK + EXE 完整執行**：本輪尚未在已授權後端送出測試；通過原始碼測試與部署並不等於 end-to-end 建置 PASS。
- **長期儲存**：目前的 ZIP 仍受 GitHub Actions artifact quota 與到期日約束。原 Render 靜態網站不是永久 APK/EXE 倉庫。
- **正式簽章、CNC 6AX 真機安全、Android 及 Windows 逐頁 Authority 圖驗收**：全部需獨立 Gate；即使成功建出測試 EXE／APK 也不能假報正式 Release。

## 排障

- health `BLOCKED_NOT_CONFIGURED`：缺少上述 Render Environment token。
- `GITHUB_TOKEN_DENIED`：GitHub 受限權限、認證錯誤或私有 repo 存取不足。
- `GITHUB_WORKFLOW_OR_BRANCH_NOT_FOUND`：workflow 文件/固定分支/Actions 權限錯誤。
- `GITHUB_BUILD_SOURCE_IDENTITY_CHANGED`：不符合 dispatch 所綁 exact SHA，不提供下載。
- `BLOCKED_ARTIFACTS_MISSING_OR_QUOTA`：workflow 缺某一平台附件、被 Actions quota 擋住、已過期。
- `BUILD_NOT_FOUND_OR_SERVICE_RESTARTED`：Render free 服務沒有持久化 queue；重新載入不能假稱舊任務已追蹤，可改到 GitHub 已提供的 workflow link 查實況；未來需導入資料庫或 durable queue。
