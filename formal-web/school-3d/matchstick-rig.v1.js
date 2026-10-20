/* Matchstick skeleton debug overlay. Never creates geometry or changes CAD/3D mesh. */
(()=>{
 'use strict';
 const qs = s => document.querySelector(s);
 const file = qs('[data-file]'), img = qs('[data-image]'), svg = qs('[data-overlay]');
 const status = qs('[data-status]'), toggle=qs('[data-toggle]'), width=qs('[data-width]');
 const infer=qs('[data-inferred]'), widthOut=qs('[data-width-out]'), empty=qs('[data-empty]');
 const XML_NS='http://www.w3.org/2000/svg';
 let spec=null,verified=false,shown=true,url=null;
 function updateStatus(s){status.textContent=s;}
 function block(reason){verified=false;svg.hidden=true;img.hidden=true;empty.hidden=false;toggle.disabled=true;updateStatus('BLOCKED — '+reason+'。正式 3D 角色尚未完成。');}
 function exactHex(buf){return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,'0')).join('');}
 function elt(name,attrs){const x=document.createElementNS(XML_NS,name);for(const [k,v] of Object.entries(attrs))x.setAttribute(k,String(v));return x;}
 function repaint(){
  if(!verified||!spec)return;
  svg.replaceChildren();const nodes=spec.nodes;
  for(const segment of spec.segments){
   if(segment.kind==='inferred'&&!infer.checked)continue;
   const a=nodes[segment.a]?.xy,b=nodes[segment.b]?.xy;
   if(!a||!b)throw Error('Invalid rig segment reference');
   svg.append(elt('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],
    stroke:segment.kind==='inferred'?'#ffc26b':'#55f0ea',
    'stroke-width':Number(width.value),'stroke-linecap':'round'}));
  }
  for(const node of Object.values(nodes)){
   if(node.status==='interpolated-for-debug-only'&&!infer.checked)continue;
   svg.append(elt('circle',{cx:node.xy[0],cy:node.xy[1],r:3,fill:'#06141b',stroke:'#b7fffe','stroke-width':1}));
  }
  svg.hidden=!shown;toggle.textContent=shown?'隱藏細骨架':'顯示細骨架';
  widthOut.value=width.value+' px';
 }
 async function loadManifest(){
  try{
   const res=await fetch('./matchstick-rig.v1.json',{cache:'no-store'});
   if(!res.ok)throw Error('找不到細骨架定位契約');
   const data=await res.json();
   if(data.schemaVersion!==1||data.release?.webHeroAllowed!==false||data.sizingContract?.allowBonesToStretchMesh!==false||
      data.sizingContract?.allow2DPixelsAs3DAnchors!==false||data.style?.maxStrokeWidthSourcePixels>3||
      !Array.isArray(data.segments)||data.authorityImage?.width!==1672||data.authorityImage?.height!==941)
      throw Error('骨架或 Authority Gate 不符');
   spec=data;updateStatus('定位契約已核對。請選擇 SHA 相符的原始 PNG；此工具不會上傳圖片。');
  }catch(e){block(e.message||'未知錯誤');file.disabled=true;}
 }
 file.addEventListener('change',async()=>{
  if(!spec||!file.files?.[0])return;
  let f=file.files[0];
  try{
   if(f.type!=='image/png'||f.size>16*1024*1024)throw Error('需要小於 16 MB 的原始 PNG');
   if(!crypto.subtle)throw Error('此環境不支援 SHA-256，請使用 HTTPS 或 localhost');
   const bytes=await f.arrayBuffer();const hash=exactHex(await crypto.subtle.digest('SHA-256',bytes));
   if(hash!==spec.authorityImage.sha256)throw Error('原圖 SHA-256 不相符，拒絕對位');
   if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(f);
   await new Promise((resolve,reject)=>{const tester=new Image();tester.onload=()=>{
    if(tester.naturalWidth===spec.authorityImage.width && tester.naturalHeight===spec.authorityImage.height)resolve();
    else reject(Error('原圖解析度不符'));};tester.onerror=()=>reject(Error('PNG 無法解析'));tester.src=url;});
   img.src=url;img.hidden=false;empty.hidden=true;verified=true;toggle.disabled=false;shown=true;
   svg.setAttribute('viewBox',`0 0 ${spec.authorityImage.width} ${spec.authorityImage.height}`);
   repaint();updateStatus('原始圖片 SHA PASS。顯示 2 px 火柴棒定位：僅校正圖中可見區域；3D 角色仍 BLOCKED。');
  }catch(e){block(e.message||'圖片驗證失敗');}
 });
 width.addEventListener('input',repaint);infer.addEventListener('change',repaint);
 toggle.addEventListener('click',()=>{if(!verified)return;shown=!shown;repaint();});
 window.addEventListener('pagehide',()=>{if(url)URL.revokeObjectURL(url);});
 loadManifest();
})();