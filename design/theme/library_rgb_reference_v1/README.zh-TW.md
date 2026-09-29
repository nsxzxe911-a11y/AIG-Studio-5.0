# Library RGB Reference v1

本目錄是 AIG II / AIG Studio 的 **ChatGPT Android Library 原圖來源庫 staging**。

- 原圖只作 Theme / Skin / Layout / Scene Reference，不得把整張靜態圖片當成 CNC 功能。
- X / Y / Z、A / B 軸、刀具、材料、走刀、碰撞、過切、材料移除仍由真 Runtime / CAM / SIM 狀態驅動。
- 不得因套用圖片改變 Master Origin、0.001 mm 顯示精度、幾何真值、CAM / SIM / NC 結果或 A_THEN_B machine-space 規則。
- 原始 PNG 匯入後必須符合 `SOURCE_SHA256.txt`，否則拒絕升為 Runtime asset。
- 目前 `runtime_activation=false`，因此 staging 不會覆蓋已驗證的正式 Theme。

## 核心素材

- `startup_aigii_future_cnc` ← `AIG II未來CNC啟動畫板.png` → `raw/startup_aigii_future_cnc_1536x1024.png` (1536×1024)
- `mobile_cad_cam_future` ← `未來感 CNC CAM 手機介面.png` → `raw/mobile_cad_cam_future_853x1844.png` (853×1844)
- `desktop_ai_cnc_5_neon` ← `AI CNC 5.0霓虹加工控制台.png` → `raw/desktop_ai_cnc_5_neon_1536x1024.png` (1536×1024)
- `axis4_hightech_sim` ← `高科技四軸加工模擬介面.png` → `raw/axis4_hightech_sim_1536x1024.png` (1536×1024)
- `axis4_aig_smart_machining` ← `AIG四軸CNC智能加工介面.png` → `raw/axis4_aig_smart_machining_1536x1024.png` (1536×1024)
- `axis5_realcam_portrait` ← `image-gen-1(1).png` → `raw/axis5_realcam_portrait_941x1672.png` (941×1672)
- `axis5_realcam_landscape` ← `image-gen-2(1).png` → `raw/axis5_realcam_landscape_1672x941.png` (1672×941)
