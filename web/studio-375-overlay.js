/* AIG-II product RGB skin. Keeps Studio CAD/CAM/SIM/NC elements, event handlers and data attributes unchanged. */
(()=>{
  "use strict";
  document.body.classList.add("aig-visual-runtime");
  document.title="AIG Studio 375｜RGB CNC 工作區";
  const brand=document.querySelector(".logo");
  if(brand)brand.textContent="AIG II";
  const subtitle=document.querySelector(".brand small");
  if(subtitle)subtitle.textContent="RGB CNC • 正式工作台";
  const status=document.querySelector(".top .status");
  if(status)status.textContent="WEB 375 • 本機工作頁";
  const footer=document.querySelector(".footer");
  if(footer)footer.textContent="AIG-II / AIG Studio 5.0 • CNC 實體機台輸出停用 • 本機資料優先";

  // All landing-page actions continue through the core's existing delegated [data-open-page] handler.
  const home=document.querySelector("[data-home-runtime]");
  const grid=home?.querySelector(".menuGrid");
  if(grid && !home.querySelector(".aig-home-hero")){
    const hero=document.createElement("section");
    hero.className="aig-home-hero";
    hero.setAttribute("aria-label","AIG II RGB 正式 HOME");
    const content=document.createElement("div");
    content.className="aig-home-hero-content";
    const eyebrow=document.createElement("div");eyebrow.className="aig-home-eyebrow";eyebrow.textContent="AIG II • RGB CNC STUDIO";
    const title=document.createElement("h1");title.className="aig-home-title";title.textContent="AIG II";
    const caption=document.createElement("p");caption.className="aig-home-caption";caption.textContent="CAD 製圖、CAM 刀路、3D 加工模擬、3～6 軸與 NC 編輯，直接進入可操作工作頁。";
    const features=document.createElement("div");features.className="aig-home-stripe";
    for(const item of ["CAD / CAM","3–6 AXIS","FANUC NC","LOCAL-FIRST"]){
      const chip=document.createElement("span");chip.textContent=item;features.appendChild(chip);
    }
    content.append(eyebrow,title,caption,features);hero.appendChild(content);
    grid.parentNode.insertBefore(hero,grid);
    // Do not use image pixels as fake clickable controls. Separate DOM buttons remain the only interactions.
  }

  const nav=document.querySelector("#nav");
  if(nav && !document.querySelector(".aig-gallery-link")){
    const a=document.createElement("a");
    a.href="./image-library.html";
    a.className="aig-gallery-link";
    a.textContent="RGB 圖庫";
    a.title="核對已入庫原圖（工作頁的所有按鈕仍直接連接 Runtime）";
    nav.insertAdjacentElement("afterend",a);
  }
})();
