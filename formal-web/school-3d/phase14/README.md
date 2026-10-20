# AIG 自研 Phase14 工作台

將本 ZIP 解壓到同一目錄，**開啟 `hair-face-workbench.v1.html`**（建議 Chrome/Edge），按「核准 PNG」選擇隨包提供的 `櫻花校園的青春時光.png`。程式在瀏覽器本機驗證 SHA-256，通過後才啟動網格。

操作：素描＋上色、風力 -100~100、播放/暫停髮絲、臉部網格修整、頭部和雙肩旋轉、網格/細骨架、編輯輪廓與匯出 JSON。所有效果是**演算法 2.5D 工作台**，不代表已完成 AI 人臉模型、3D 髮絲或者正式電影。

**使用者資料**：圖片以 File API 在本機讀取，不送雲端；修改只會寫進使用者點選「匯出」所得的 JSON 檔案。若瀏覽器政策禁止 file://，可以使用本機 localhost 靜態 HTTP Server 作預覽（依環境政策允許）。

**工程驗證**：`node tools/test_beauty_engine.js`、`python -m unittest discover -s tools -p test_phase14_contract.py -v`。`tools/render_browser_motion.py` 需本機 Chromium、Playwright、OpenCV，並不包含在 GitHub CI 中。