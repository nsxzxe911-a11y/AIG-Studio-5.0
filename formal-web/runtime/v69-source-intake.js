/* AIG V69 actual local-first source intake: image preview, two-point
 * reference calibration and NC-first import. No inferred dimensions,
 * fabricated CAD vectors, CAM toolpaths, machining or machine output.
 */
(function(w,d){"use strict";
const stages=["來源","CAD","CAM","3D 走刀","SIM","NC","交付"];
let state={kind:null,name:null,calibration:null,imageHash:null,ncHash:null,stage:"來源",ready:false},objectURL=null,points=[],img=null,view=null;
const $=q=>d.querySelector(q);
function route(page){const name=page==="3D 走刀"?"刀路":page;const nav=[...d.querySelectorAll(".nav button")].find(x=>x.dataset.page===name);if(nav){nav.click();return true}return false}
function notice(s,type="neutral"){const el=$("#aig69-status");if(el){el.textContent=s;el.dataset.level=type}}
function draw(){if(!img||!view)return;const cv=$("#aig69-photo-canvas");if(!cv)return;const ctx=cv.getContext("2d");if(!ctx)return;
 const W=cv.width,H=cv.height;ctx.clearRect(0,0,W,H);ctx.fillStyle="#061522";ctx.fillRect(0,0,W,H);
 const ratio=Math.min(W/img.naturalWidth,H/img.naturalHeight);const dw=img.naturalWidth*ratio,dh=img.naturalHeight*ratio,x=(W-dw)/2,y=(H-dh)/2;
 ctx.drawImage(img,x,y,dw,dh);ctx.strokeStyle="#5ef2ff";ctx.lineWidth=2;
 for(const p of points){ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.stroke()}
 if(points.length===2){ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);ctx.lineTo(points[1].x,points[1].y);ctx.stroke()}
}
async function digest(file){if(!w.crypto?.subtle)return null;const buf=await file.arrayBuffer();const hash=await w.crypto.subtle.digest("SHA-256",buf);return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function dimensions(){if(!img)return null;const cv=$("#aig69-photo-canvas");const ratio=Math.min(cv.width/img.naturalWidth,cv.height/img.naturalHeight);
 return {ratio,x:(cv.width-img.naturalWidth*ratio)/2,y:(cv.height-img.naturalHeight*ratio)/2};}
async function chooseImage(file,kind){
 if(!file)return;
 if(!file.type.startsWith("image/")||file.size>25*1024*1024){notice("只接受 25 MB 以下圖片，來源未變更。","alarm");return}
 const hash=await digest(file);const url=URL.createObjectURL(file);const next=new Image();
 try{await new Promise((resolve,reject)=>{next.onload=resolve;next.onerror=reject;next.src=url})}
 catch(_){URL.revokeObjectURL(url);notice("圖片解碼失敗；不修改目前專案。","alarm");return}
 if(objectURL)URL.revokeObjectURL(objectURL);objectURL=url;img=next;points=[];
 state={...state,kind,name:file.name,imageHash:hash,calibration:null,ncHash:null,ready:false,stage:"來源"};
 $("#aig69-photo-canvas").hidden=false;$("#aig69-photo-help").hidden=false;
 $("#aig69-nc-input").hidden=true;$("#aig69-nc-send").hidden=true;
 draw();render();
 notice("圖片已載入（"+img.naturalWidth+"×"+img.naturalHeight+"）。請點兩個已知距離端點，再輸入實際 mm；尚未產生 CAD 幾何。");
}
function render(){
 const el=$("#aig69-stage-list");if(!el)return;
 el.textContent="";
 for(const label of stages){const item=d.createElement("span");item.className="aig69-stage";
  item.dataset.current=String(state.stage===label);item.textContent=label;el.append(item)}
 const detail=$("#aig69-source-info");
 if(detail)detail.textContent=state.kind?
  "來源："+state.kind+" · "+(state.name||"")+" · "+(state.calibration?"比例 "+state.calibration.mmPerPixel.toFixed(6)+" mm/px（僅圖片比例，未驗證加工精度）":"尚未完成尺寸校正") :
  "選擇來源：拍照、匯入照片、CAD 畫圖或 NC-first";
 const btn=$("#aig69-go-cad");if(btn)btn.disabled=state.kind!=="CAD"&&!(state.calibration&&state.kind!=="NC_FIRST");
}
function calibrate(){
 if(!img||points.length!==2){notice("請先在照片上選取兩個參考點。","alarm");return}
 const mm=Number($("#aig69-known-mm").value);
 if(!Number.isFinite(mm)||mm<=0||mm>100000){notice("請輸入大於零的真實參考距離（mm）。","alarm");return}
 const {ratio}=dimensions();const dx=points[1].x-points[0].x,dy=points[1].y-points[0].y;
 const px=Math.hypot(dx,dy)/ratio;
 if(px<3){notice("兩點距離太近，無法可靠校正。","alarm");return}
 state.calibration={referenceMm:mm,referencePixels:px,mmPerPixel:mm/px,method:"TWO_POINT_USER_REFERENCE",precisionVerified:false};
 state.ready=true;render();
 notice("已記錄比例 "+state.calibration.mmPerPixel.toFixed(6)+" mm/px。照片仍是參考底圖，需在 CAD 描線／建立幾何後才能加工。","ok");
}
function clickPoint(ev){
 if(!img)return;const cv=ev.currentTarget,rect=cv.getBoundingClientRect();
 const x=(ev.clientX-rect.left)*cv.width/rect.width,y=(ev.clientY-rect.top)*cv.height/rect.height;
 const box=dimensions(),wpx=img.naturalWidth*box.ratio,hpx=img.naturalHeight*box.ratio;
 if(x<box.x||y<box.y||x>box.x+wpx||y>box.y+hpx)return;
 if(points.length>=2)points=[];points.push({x,y});state.calibration=null;render();draw();
 notice("已選取 "+points.length+" / 2 個參考點。");
}
async function chooseNC(file){
 if(!file)return;
 if(file.size>2*1024*1024){notice("NC 檔超過 2 MB，拒絕載入。","alarm");return}
 const text=await file.text();
 if(!text.trim()||text.includes("\0")){notice("NC 檔內容無效。","alarm");return}
 $("#aig69-nc-input").value=text;$("#aig69-nc-input").hidden=false;$("#aig69-nc-send").hidden=false;
 state={...state,kind:"NC_FIRST",name:file.name,ncHash:await digest(file),calibration:null,ready:true,stage:"來源"};
 render();notice("已載入 NC 工作副本。按「送至 NC 編輯器」才會更新編輯區；不會送往機台。");
}
function transferNC(){
 const code=$("#aig69-nc-input").value,root=$('[data-nc-runtime] [data-nc-code]');
 if(!root||!code.trim()){notice("NC 編輯器未就緒，未覆蓋任何內容。","alarm");return}
 if(!w.confirm("將匯入內容寫入 NC 工作編輯區？現有未保存內容可能被取代；不會輸出至機台。"))return;
 root.value=code;root.dispatchEvent(new Event("input",{bubbles:true}));
 state.stage="NC";render();route("NC");
 notice("已送至 NC 編輯區。解析、模擬、Fanuc 驗證仍需逐項完成；不可直接上機。","ok");
}
function startCAD(){
 if(!state.kind){state.kind="CAD";state.name="CAD 新圖";state.stage="CAD"}
 else if(state.kind!=="CAD"&&!state.calibration){notice("照片未完成比例校正，禁止宣稱尺寸準確。","alarm");return}
 else state.stage="CAD";
 render();route("CAD");
 notice(state.kind==="CAD"?"已開啟原有 CAD 真實製圖工作區。":"已開啟 CAD：圖片未自動轉為線段，請依參考圖手動建立幾何。","ok");
}
function mount(){
 const screen=$('.screen[data-page="HOME"]');if(!screen||$("#aig69-intake"))return false;
 const panel=d.createElement("section");panel.id="aig69-intake";panel.className="aig69-intake";
 panel.innerHTML='<div class="aig69-heading"><strong>AIG · 從來源到成品</strong><small>照片／CAD／NC-first · 離線優先 · 機台輸出關閉</small></div>'+
 '<div id="aig69-stage-list" class="aig69-stages" aria-label="製程階段"></div>'+
 '<div class="aig69-entry">'+
 '<label class="aig69-source-button">📷 拍照<input id="aig69-camera" type="file" accept="image/*" capture="environment"></label>'+
 '<label class="aig69-source-button">🖼 匯入照片<input id="aig69-photo" type="file" accept="image/*"></label>'+
 '<button type="button" id="aig69-start-cad" data-button-id="BTN.HOME.SOURCE.START_CAD">✏ CAD 畫圖</button>'+
 '<label class="aig69-source-button">⌨ 匯入 NC<input id="aig69-nc-file" type="file" accept=".nc,.tap,.txt,.gcode,.cnc,text/plain"></label></div>'+
 '<p id="aig69-source-info" class="aig69-source-info"></p>'+
 '<canvas id="aig69-photo-canvas" width="900" height="480" aria-label="照片比例校正：依序點兩個參考點" hidden></canvas>'+
 '<div id="aig69-photo-help" class="aig69-calibrate" hidden><label>兩點實際距離（mm）<input id="aig69-known-mm" type="number" min="0.001" step="0.001" placeholder="例如 100.000"></label>'+
 '<button type="button" id="aig69-calibrate" data-button-id="BTN.HOME.SOURCE.CALIBRATE">校正照片比例</button></div>'+
 '<textarea id="aig69-nc-input" aria-label="匯入的 NC 工作副本" hidden></textarea>'+
 '<div class="aig69-actions"><button type="button" id="aig69-go-cad" data-button-id="BTN.HOME.SOURCE.OPEN_CAD" disabled>進入 CAD →</button>'+
 '<button type="button" id="aig69-nc-send" data-button-id="BTN.HOME.SOURCE.SEND_NC" hidden>送至 NC 編輯器 →</button>'+
 '<button type="button" id="aig69-go-cam" data-button-id="BTN.HOME.SOURCE.OPEN_CAM">手動 CAM →</button></div>'+
 '<p id="aig69-status" role="status" aria-live="polite"></p>';
 screen.insertBefore(panel,screen.firstChild);
 $("#aig69-camera").addEventListener("change",e=>chooseImage(e.target.files?.[0],"CAMERA"));
 $("#aig69-photo").addEventListener("change",e=>chooseImage(e.target.files?.[0],"PHOTO"));
 $("#aig69-nc-file").addEventListener("change",e=>chooseNC(e.target.files?.[0]));
 $("#aig69-start-cad").addEventListener("click",()=>{state={kind:"CAD",name:"CAD 新圖",calibration:null,imageHash:null,ncHash:null,stage:"CAD",ready:true};startCAD()});
 $("#aig69-photo-canvas").addEventListener("click",clickPoint);
 $("#aig69-calibrate").addEventListener("click",calibrate);
 $("#aig69-go-cad").addEventListener("click",startCAD);
 $("#aig69-nc-send").addEventListener("click",transferNC);
 $("#aig69-go-cam").addEventListener("click",()=>{state.stage="CAM";render();route("CAM");notice("手動 CAM 可不經 CAD；刀路產生、碰撞與 NC 仍須各自驗證。")});
 render();notice("請選擇起點。此入口不會自動產生幾何、刀路或實體成品。");return true;
}
function init(){if(mount())return;let n=0;const t=w.setInterval(()=>{if(mount()||++n>20)w.clearInterval(t)},500)}
w.AIG_V69_SOURCE=Object.freeze({version:"69.0.0",inspect:()=>JSON.parse(JSON.stringify({...state,photoLoaded:!!img,referencePoints:points.length,machineOutput:"BLOCKED",digitalFinishedPart:false})),route});
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",init,{once:true});else init();
})(window,document);