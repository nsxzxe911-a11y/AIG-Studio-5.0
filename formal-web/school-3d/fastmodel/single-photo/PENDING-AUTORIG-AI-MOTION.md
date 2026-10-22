# FastModel｜已核准、待執行：自動修復模型 + AI 動作控制

- 入庫日期：2026-10-22
- 使用者指示：「入庫待執行，先執行斷點」
- 狀態：**APPROVED / QUEUED / NOT_IMPLEMENTED / NOT_VERIFIED**
- 既有可信斷點：FastModel 7.11 core `01622ded4ad25a8c896966e00502a0ba711f1579`；先推進原定 7.12 多影格相機姿態估計與幾何可信度，完成其實證 Gate 後才開始本清單
- 本需求不得占用現有 7.12 Camera Pose 的版本編碼；後續以正式核准編碼逐步向前，**只能升級不可回退**。

## 入庫需求（尚未宣稱實作）

目標：照片／影片生成的來源模型先通過幾何與拓樸品質修補，然後接上可受 AI 命令控制的人形角色。

### A. AutoRig 與自動幾何修復
- 根骨 Root、骨盆 Pelvis、Spine/Chest、Neck/Head、肩膀/手臂/手部、髖/大腿/小腿/腳掌/腳趾；左右獨立關節
- 自動檢查頭頸連接、人體比例、骨頭長度、左右關節、膝肘彎折、腳底貼地、穿模與皮膚／蒙皮權重歸一
- 單張照片中看不到的關節與人體部位必須標示推估、保留可信度，不得用技術替身冒充真實人物
- 人／動物／非人模型須有不同 rig 類別，不得以通用人形骨架強套到植物、車輛、房屋

### B. 動作狀態機與真控制
- Idle、Walk、Run、JumpStart/JumpAir/JumpLand、CrouchDown/CrouchHold、StandUp、TurnLeft/TurnRight、Stop
- Root motion / locomotion 速度、加速、狀態轉移；雙腳交替、蹲姿支撐、跳躍離地與落地
- 真實模型權重與骨架蒙皮同步，不以播放固定影片、移動鏡頭或更換靜態圖片偽裝動作

### C. IK/物理安全與接地
- 兩足 IK、重心與骨盆高度、腳掌地面鎖定、斜坡適應、踢步/滑步/穿地/反折阻擋
- 可控安全狀態與故障回退到最後有效工作副本；不得清空來源照片或重置既有模型

### D. AI 控制命令接口
- 可輸入自然語言／遊戲控制指令：前進、跑步、跳躍、蹲下、起立、轉身、停止
- Command ID → 語義解析 → 可驗證狀態機 → Rig/IK/Physics → Runtime render → 真輸出回饋
- 不得假按鈕、不依賴第三方雲端才能進入正式 RGB UI，手機／Windows 操作一致

## 必須通過的 Gate（後續待建立）

1. **AUTHENTIC_SOURCE**：使用者實際角色圖片／影片與輸出連續性，不能只用合成測試圖宣稱擬真
2. **TOPOLOGY_AND_WEIGHTS**：權重和 = 1、無破皮穿透、頭頸真接合、物件類型對 rig 相容
3. **MOTION_GEOMETRY**：每幀 XYZ 真改變，根骨與四肢關節、重心、雙腳地面接觸真實計算
4. **STATE_MACHINE**：Idle→Walk→Run→Jump→Land→Crouch→Stand→Turn→Stop 合法轉移、無無限等待
5. **NC_PROJECT_ISOLATION**：FastModel 修改不破壞 AIG-II/AIG Studio 5.0 的 CAD/CAM/SIM/NC/CNC 安全核心
6. **BROWSER_NATIVE**：離線 RGB 主程式啟動、手機和電腦真 UI 操作與實際角色動作證據；APK/EXE 另 Gate，不以 Chromium 冒稱原生

## 施工依賴

先執行原斷點：7.11 VERIFIED → 7.12 video multi-view fundamental/essential geometry and bounded camera-pose quality with source provenance.  
接著經獨立 Gate 檢查模型幾何可信度，再按 A→B→C→D 實作本 AutoRig/AI Motion backlog。

此文件只代表**已入庫待執行**，任何人不得將其標記為程式完成或實機 PASS。
