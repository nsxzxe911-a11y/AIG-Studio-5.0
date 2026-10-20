# AIG FastModel 1.2 — 光追預設關閉 / Raster-Only

確認來源 commit `953f4079` 的實際 `renderer.mjs`：使用 WebGL2 vertex/fragment rasterization + texture + skinning；沒有 DXR、Vulkan RT、ray query 或 path tracing。所以**以前本來就沒有光追開啟**。

本次新增永久安全保護：`graphics-policy.mjs` 限定 `WEBGL2_RASTER`，所有 RT 路徑 false；未來其他設定若嘗試打開 RT，啟動前直接 BLOCK。畫質頁以真實狀態顯示「光線追蹤：關閉」，不是裝飾性假按鈕。離線 HTML 經 `build_standalone.py` 同步嵌入相同 guard。

Windows DX12 原生及 Android Vulkan 原生渲染後端**尚未實作**，這項策略為將來的預設契約，不冒充既有 DX12/Vulkan 設定。一般無 RTX/DXR 的 GPU 仍需具備 WebGL2 等基本需求，60 FPS 與 2K／4K 尚待實機驗收。

3D 女主角圖片另行儲存為**視覺參考候選**，不會冒充可動畫 GLB、也不會自動取代原核准原圖。正式 Render、APK、EXE、CNC 均不修改；PR 保持 Draft。