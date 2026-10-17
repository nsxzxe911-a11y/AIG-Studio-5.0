# AIG AUTHORITY REVERSE ENGINEERING V2
## Visual-Grounded / Semantic-Control / Runtime-Proven

AIG 第一專案正式主頁只有：HOME / CAD / CAM / SIM / 3AX / NC / AI。
BOOT / LOGIN / SETTINGS / PROJECT 可作正式輔助頁。
AIG 第一專案禁止加入 4AX / 5AX / 6AX；那些屬於 AIG-II。

## 0. Continuity Recovery
每次施工先讀 current branch、HEAD SHA、latest successful/failed Gate、Authority/Region/Button/Command Manifest、最近 Runtime screenshot evidence，建立 CONFIRMED / UNCONFIRMED / BLOCKED / NEXT。禁止猜測已完成、重做 PASS、回退 Authority、因單一錯誤覆蓋整頁、因例外初始化或清空 Runtime state。只升級，不回退。

## 1. Source Authority Lock
每張 Authority 必須記錄 Authority ID / Project / Platform / Page / Subpage / Version / SHA-256 / Width / Height / Approval State / Supersedes / Superseded By。不得相信 filename 裡的 4K；實際尺寸不符即 SOURCE_DIMENSION_MISMATCH，不得以 upscale 偽裝 Native 4K。

## 2. Visual Grounding
先解析 Authority，再寫 UI。區域分類：STATIC_VISUAL / INTERACTIVE_CONTROL / DYNAMIC_TEXT / DYNAMIC_VALUE / VIEWPORT / MESSAGE_REGION / DECORATIVE_REGION / UNKNOWN_REGION。每區建立 REG.<PAGE>.<SEMANTIC_NAME>，保存 pixel 與 normalized bounds。

## 3. Hierarchical Layout Reconstruction
Authority → Page → Section → Panel → Region → Control → State。先找共同邊界、對齊線、間距、中心線、主視窗比例、控制區比例、導航與訊息區高度，再建立 Layout Contract。Region 必須可回投原始像素座標。

## 4. Static Skin / Real Control Separation
LAYER 0 = AUTHORITY VISUAL LAYER：RGB frame、背景、玻璃、機台視覺、裝飾；pointer-events:none。
LAYER 1 = RUNTIME CONTROL LAYER：真 button/input/editor/canvas/3D viewport/status/coordinates/messages；pointer-events:auto。
底圖不得截走點擊；圖片文字不得當 Runtime 狀態。

## 5. Button Reverse Mapping
Visual Region → Button ID → Command ID → Runtime/Core Callback。禁止 Button ID = Command ID，除非 Shared Contract 明確定義。格式 BTN.<PAGE>.<FUNCTION> / CMD.<DOMAIN>.<ACTION>。按需驗 NORMAL / PRESSED / SELECTED / DISABLED / ALARM。

## 6. Message / Value No-Fake Gate
圖片中的座標、Feed、RPM、刀號、Error、Alarm、Status、Removed Volume、FPS、Connection State 只作外觀參考；Runtime 必須覆蓋真值。baked text 不得算 Runtime output；必要時建立 clean background / mask / crop / nine-slice，再由 Runtime 文字覆蓋。

## 7. Error Root-Cause Classifier
FAIL 先分類：SOURCE_ERROR / DIMENSION_ERROR / REGION_ERROR / LAYOUT_ERROR / LAYER_ERROR / ASSET_ERROR / SEMANTIC_ERROR / CALLBACK_ERROR / STATE_ERROR / DATAFLOW_ERROR / RENDER_ERROR / VISUAL_DIFF_ERROR / GATE_ERROR。
每次輸出 Observed / Expected / First Divergence / Root Cause / Minimal Fix / Affected Scope / Regression Risk / Evidence Required。只修 FIRST DIVERGENCE，禁止一次重寫整個 Runtime。

## 8. Minimal Patch Rule
Asset 錯不要動 Core；CSS 錯不要動 CAM Engine；Command Mapping 錯不要換 Authority；Verifier 錯不要為它重寫產品架構。Verifier 應驗產品結果，不應綁死函式名稱。

## 9. Visual Regression Gate
固定 Browser version / Viewport / Device scale factor / Font / OS image / Renderer / Theme / Language。分層驗：A 尺寸完整性、B Region geometry、C Anchor/template、D Pixel diff、E Human visual review。導航框、按鈕、面板位置、Authority RGB frame 採嚴格容差。

## 10. Blur / Upscale Gate
scale = min(1.0, availableWidth/sourceWidth, availableHeight/sourceHeight)。禁止 scale>1，除非有核准更高解析 Authority。image-rendering hack / CSS transform upscale / browser zoom fake 4K 不算 Native PASS。

## 11. Cross-Platform Semantic Lock
Android / Windows / Web 可有不同 Layout Adapter，但共用 Page ID / Subpage ID / Button ID / Command ID / Result semantic / Core behavior。像素座標只服務 Visual Mapping，不得當功能 Primary Key。

## 12. AIG Product Guard
每次 render AIG 第一專案前掃 4AX / 5AX / 6AX / A-axis / B-axis / C-axis。若成為正式導航、正式加工頁或正式核心能力：PROJECT_SCOPE_CONTAMINATION=FAIL。歷史檔或 fixture 必須標非 Runtime。

## 13. No Engineering Shell
正式 HOME 不得出現工程 debug card、Runtime engineering label、renderer diagnostic dashboard、developer navigation、placeholder panel、generic green shell、測試專用文字。工程資訊只能在 Settings→Maintenance→Engineering 且非預設入口。

## 14. Functional Proof
Authority → Region → Skin → real control → Button ID → Command ID → Shared Runtime/Core → Result → UI State → Screenshot Evidence。所有按鈕必須能追到 callback；禁止 decorative fake button。

## 15. Stage Order
1 Source Lock
2 Visual Grounding + Region Manifest
3 Layout Contract
4 Authority Skin / Nine-Slice
5 Real Controls
6 Button ID / Command ID
7 Runtime/Core Callback
8 Dynamic State / Message
9 Visual Regression
10 Cross-platform Verification

## 16. Screenshot Evidence
每個 Stage 產真 Runtime screenshot：AIG_<PAGE>_<STAGE>_<PLATFORM>_<SHA>_<PASS|FAIL>.png。禁止 Authority 圖、mockup、合成圖冒充 Runtime evidence。

## 17. Auto-Debug Loop
Capture evidence → Classify Root Cause → Locate First Divergence → Minimal Patch → Focused Test → Runtime Screenshot → Visual Diff → Functional Callback Test → Regression Test → Commit Checkpoint。最多連續三輪同類猜測，之後強制重新檢查 source / manifest / DOM / computed style / asset dimensions / runtime state / screenshot environment。

## 18. Checkpoint
保存 branch / HEAD SHA / Authority SHA / changed files / Gate command / Gate result / Runtime screenshot / known limitations / next Stage。斷線後只從最後成功 checkpoint 繼續。

## 19. Current Priority Mode
HOME Authority Runtime 未成立前，不同時開工 CAD/CAM/SIM。先做 HOME Golden Path：7-page nav、完整 Authority visual、無工程殼遮蓋、無 upscale、真 button、真 callback、真 message、Runtime screenshot、visual PASS。成功後同 pipeline 複製到 CAD/CAM/SIM/3AX/NC/AI。

## 20. Final PASS
同時滿足：視覺像 Authority、功能是真功能、按鈕是真控制、狀態是真狀態、錯誤是真 Runtime output、無工程殼、無假文字、無假 button、無錯專案功能、無 upscale 偽裝、有 fresh Runtime screenshot、有 fresh test evidence。任一未成立即 BLOCK。

## Execution Principle
Pixel is evidence. Semantic ID is identity. Core callback is function. Runtime screenshot is proof.
先理解畫面，再建立結構，再接真控制，再接核心，最後用實際 Runtime 對回 Authority。每次只修第一個真正分歧點。
