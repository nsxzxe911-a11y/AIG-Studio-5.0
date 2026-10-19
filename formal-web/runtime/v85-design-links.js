/* V85: optional design references, never replacing live CNC commands. */
(function(w,d){"use strict";
const refs=[
{page:"NC",selector:"[data-nc-runtime] .ncEditorMain .head",file:"nc_rgb_4k.webp",label:"NC 4K 設計候選圖"},
{page:"AI",selector:"[data-ai-page-runtime] .aig82-intro",file:"ai_rgb_4k.webp",label:"AI 4K 設計候選圖"},
{page:"刀路",selector:"[data-tp-runtime] .toolstrip",file:"toolpath_rgb_4k.webp",label:"3D 走刀待重製候選圖"}];
function mount(){for(const x of refs){const page=[...d.querySelectorAll(".screen[data-page]")].find(n=>n.dataset.page===x.page);
 const anchor=page?.querySelector(x.selector);if(!anchor||anchor.querySelector("[data-aig85-design-link]"))continue;
 const a=d.createElement("a");a.className="aig85-design-link";a.dataset.aig85DesignLink=x.page;
 a.href="./visual-library/candidates/v84/"+x.file;a.target="_blank";a.rel="noopener";
 a.textContent=x.label+" ↗";a.title="靜態圖片僅作外觀對照，真正按鈕仍在目前工作頁";anchor.append(a);
 }}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
w.AIG_V85_DESIGN_LINKS=Object.freeze({mount,inspect:()=>refs.map(x=>({page:x.page,linked:!!d.querySelector('[data-aig85-design-link="'+x.page+'"]')}))});
})(window,document);
