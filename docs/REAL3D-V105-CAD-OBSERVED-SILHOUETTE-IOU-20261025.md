# Real3D V105｜CAD 俯視實際輪廓 IoU + 3D 模型有限度平面定位

日期：2026-10-25。承接 V104 的單一原始模型六面檢查。使用者的核心問題是「渲染出的模型和原圖差太多」，要改善的是來源幾何的可量測誤差，**不能再用光影、4K 或外框相同冒充原圖幾何相符**。

## 新增真計算

- `aig-real3d-v105-cad-silhouette-registration.mjs`：對原始真正 Indexed XYZ Mesh，套用 scene 真 world transforms 與 CNC X/Y/Z mm 的 Z-up→Real3D Y-up 座標映射，將真 3D 俯視面投影到一個「模型和已標定 CAD 同用的毫米平面」。以三角面面積覆蓋格網建構真 CAD TOP source silhouette（不是光影假圖），對使用者傳入的 CNC XY 封閉輪廓以 point-in-polygon 填出獨立 measured/estimated mask。
- 兩個 raster 在**共同的 mm 格網**比較：實際重合像素、漏掉的 CAD 區域、多出 3D 區域與 IoU；有相同 min/max 外框但中間缺口不同的真 CAD 不會被錯誤當作 100% 相同。
- 當且僅當 CAD 被明確標示 `OBSERVED`、使用者另外授權 `authorizeTranslation`，且測得 IoU 改善量超過門檻，允許在 **<=0.5mm（工作頁預設）** 搜尋真 source mesh 的 XYZ 工作副本，全場景只作 CNC XY 方向平移。不得縮放、改座標原點、改工件高度、改三角面、改 UV/貼圖/材料、猜測背面或捏造幾何補洞。
- 非實測 `AI_ESTIMATED` 的 CAD 可以做診斷及差異可視化，但嚴格 BLOCK 任何套用校正；沒有來源、來源簽章不符、輪廓自相交等也 BLOCK。
- Scene Working Copy 只深拷貝 node transform，Mesh 真 XYZ、indices/UV/tangents 仍是原始來源，且須經 V99 WebGL 實際重新繪製並通過來源 SHA。
- 此模組是 deterministic geometry registration，不是已訓練「從照片補出完整五官與頭髮」的 AI。對長棕髮、衣服、動物等高真實度造型，仍必須得到具授權的 neural/scan 原始 3D 幾何與真實測量證據才能繼續提升。使用者手動將一張圖片標為 OBSERVED 也並非獨立第三方量測驗證，所以模型身份或原圖自然相似度仍 BLOCK。

## 實際可操作研究頁

原 `formal-web/shared-3d/aig-real3d-v99-native-source-lab.html` 新增 V105 對照，使用與 V104 共通的 CNC XY 點列／OBSERVED 選擇，可按「V105 計算真輪廓差異」，顯示綠＝重合、黃＝模型多出、紫＝CAD 缺失。允許 explicit checkbox 在差異有足夠改善時只平移工作副本；和既有真 WebGL/4K 共用單一 GLB，預覽實際更新。若不確定測量來源，請保持 OBSERVED 未勾選，程序不產生定位副本。

## 驗收與限制

Node 單元測試：相同輪廓 IoU 接近 1；具有相同 bounding box、但真 L 型凹槽不同不能叫 1:1；m/MM 準度一致；實測 CAD 平移可提升 IoU、原頂點/面數/UV 不變；AI 推估來源 BLOCK。真 Chromium 測試：上傳具來源 SHA 的二進位 GLB 及圖片，CNC 單位 MM，測未觀測、無授權的 Gate，再在授權情況下取得真 Working Copy、真 GPU 重新繪製和來源 SHA 保持。

V105 成功仍不代表 AI 已生成與照片完全相同的身形、人物臉部、飛船外型。只有已量測的俯視 CAD 幾何才能約束 TOP 的對位誤差，未知高度/反面與五官不能從這個 IoU 推導出來。沒有 AI 生成權重及實際樣本相似度時，AI 真重製身份 Gate 仍 BLOCK。正式 Render RGB 首頁不變，CNC/Fanuc 核心不受影響，APK/EXE 不打包，Draft only。
