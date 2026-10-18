/* AIG-II presentation overlay. No G-code, geometry, simulation or control-state mutation. */
(()=>{
  document.title="AIG-II | CNC Web Runtime";
  const brand=document.querySelector(".logo");if(brand)brand.textContent="AIG II";
  const sub=document.querySelector(".brand small");if(sub)sub.textContent="AIG CNC • 正式 Web 工作頁";
  const footer=document.querySelector(".footer");if(footer)footer.textContent="AIG-II / AIG Studio Web • CNC 機台輸出停用 • APK / EXE 驗證獨立";
  const nav=document.querySelector("#nav");if(!nav)return;
  const a=document.createElement("a");a.href="/gallery.html";a.textContent="RGB 圖庫";a.title="查看來源已入庫的 RGB 圖像（不覆蓋工作頁）";
  a.style.cssText="display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:7px 11px;white-space:nowrap;border:1px solid #36718f;border-radius:10px;color:#e7faff;text-decoration:none;background:#081522;font-size:13px";
  nav.insertAdjacentElement("afterend",a);
})();
