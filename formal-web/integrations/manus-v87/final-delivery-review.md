# AIG V87 — Manus 最終成果：GPT 主線接管稽核

日期：2026-10-20（來源包名稱沿用 2026-10-19）
任務：Manus MASuqJksfKEaHGqz7yFXi8，已完成，無需後續 Manus 執行。

## 包裝 / 完整性

- 原始互動原型 ZIP SHA-256：`98f490dd4a8e8d3395b9c63cce96947443007f2ffdc89183d3b597723db12dd8`（14 個一般檔案）。
- 最終簡報合輯 ZIP SHA-256：`5049ad89079ea87e3db275c5a593f23f88b2f14ca8579a8c8dd0e6a9249fb97d`（27 個一般檔案）。
- 原始 14 個檔案全部存在於最終 ZIP，逐檔 SHA-256 **一致，沒有任何原始碼變更**。
- 最終包新增 13 件素材：1 PDF、1 PPTX、10 張投影片的獨立 HTML 展示頁，以及 `html-syntax.md`。
- PPTX 實際為 10 頁；PDF 是相同內容的 10 頁提案。單獨上傳的兩份 PDF SHA 相同：`bcab288a3343d11ad27f9952bf10474ed9f589e66e39669f057d25595a7c6c62`。
- 上述為新增設計**說明**，不是 11 頁 CNC 互動工作區的新版本。

## 提案重點（依 PDF 實際頁碼）

| PDF 頁 | 提案 |
|---|---|
| 2 | 移除重複長頁控制台，CAD/CAM/6AX 主畫布優先；6AX 主視窗 65～75%。 |
| 3 | 主畫布、真實狀態、工具位置、禁真機輸出、焦點／44px 觸控等 6 項原則。 |
| 4 | CAD → CAM → 3D 走刀 → SIM → NC Gate → 數位成品；允許 NC-first 與手動 CAM。 |
| 5 | 11 個工作頁，3AX～6AX MACHINE / NC-first。 |
| 6 | 6AX 中央工作視窗、XYZABC HUD、NC 抽屜、底部狀態列。 |
| 7 | Manus 的候選 Page／Button ID／callback 契約（不能取代正式 V68 manifest）。 |
| 8 | UI 顯示 LOCAL DRAFT / NO EVIDENCE / OFFLINE / BLOCKED；不冒充 CNC PASS。 |
| 9 | 6AX 模式切換、NC 草稿、3D 節點以及鍵盤/觸控驗收案例。 |
| 10 | MACHINE feedback、材料移除、碰撞、Fanuc 與 Gate 等主線風險。 |

## 主線採用決定

- **可直接參考**：RGB Glassline、中央主視窗比例、手機獨立堆疊、右側 HUD、狀態列、可收合 NC、無障礙 focus。
- **需要 adapter**：正式 ID 與真 callback；先以原本 84 個 Button ID 契約作比對，不以 Manus H0/C1/A6 候選命名覆寫。
- **不得直接採用**：CAD 假計數、CAM 假刀路、NC 文字未真正儲存、簡化 6AX SVG 模型、原型的「安全完成」狀態。
- **正式部署 BLOCK**：未完成真 Runtime adapter、桌面/手機逐頁視覺與 callback Gate、材料移除數值證據與 CNC Safety Gate。
- 來源 ZIP 存入 `original/`；正式 `mobile-runtime.html` / 原 Render 網站**沒有被這批外部素材替換**。

## 下一段施工

1. 在隔離區驗證原始 ZIP 與最終 ZIP 的逐檔一致性及 CNC 安全。
2. 將 Manus 的 CSS layout 原則逐頁轉換為只作用在**真實 Runtime 元件**的樣式/DOM adapter；先 6AX + NC，再 CAD/CAM/SIM。
3. NC-first 必須保存真實 G-code 工作副本，切換模式不得失去文字及解析/材料移除狀態。
4. Web PASS 後才談 APK/EXE，兩者須做平台專屬驗收。任何 CNC 真機輸出仍 BLOCKED。
