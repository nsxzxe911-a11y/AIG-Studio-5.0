/** FastModel: local source map editing and GeoJSON data imports.
 * No network, no arbitrary place-name geocoding and no invented metric scale.
 */
import {
 createAIG712SceneMap,addAIG712SceneFeature,summarizeAIG712SceneMap,
 compareAIG712SceneFeaturePercent,importAIG712GeoJSON,exportAIG712SceneMap
} from './aig-scene-map-7-12.mjs';
import {openAIG716AssetLibrary} from './aig-external-asset-library-7-16.mjs';
const $=id=>document.getElementById(id),canvas=$('map'),ctx=canvas.getContext('2d');
const colors={building:'#72cfff',house:'#98daff',tree:'#80eca0',road:'#ffce78',
 sports_facility:'#dc94ff',water:'#6aaaff',vehicle:'#ff999a',
 landmark:'#c0ffd1',other:'#ffffff'};
let map=createAIG712SceneMap({sourceLabel:'USER_ANNOTATED_SCENE'}),pending=[],serial=0;
let view={minX:0,minY:0,maxX:200,maxY:120},lastImported=false;
const status=(s,pass=false)=>{$('status').dataset.pass=pass?'true':'false';$('status').textContent=s;};
const pts=g=>g.type==='Point'?[g.coordinates]:g.type==='Polygon'?g.coordinates[0]:g.coordinates;
function viewBounds(){
 if(!map.features.length)return{minX:0,minY:0,maxX:200,maxY:120};
 const p=map.features.flatMap(f=>pts(f.geometry));
 const minX=Math.min(...p.map(q=>q[0])),maxX=Math.max(...p.map(q=>q[0])),
  minY=Math.min(...p.map(q=>q[1])),maxY=Math.max(...p.map(q=>q[1])),
  cx=(minX+maxX)/2,cy=(minY+maxY)/2,
  width=Math.max(20,maxX-minX)*1.3,height=Math.max(12,maxY-minY)*1.3;
 return {minX:cx-width/2,maxX:cx+width/2,minY:cy-height/2,maxY:cy+height/2};
}
function project(p){
 const w=canvas.width,h=canvas.height;
 const margin=32,xScale=(w-2*margin)/(view.maxX-view.minX),
  yScale=(h-2*margin)/(view.maxY-view.minY),
  scale=Math.min(xScale,yScale),
  px=margin+(w-2*margin-(view.maxX-view.minX)*scale)/2,
  py=margin+(h-2*margin-(view.maxY-view.minY)*scale)/2;
 return [px+(p[0]-view.minX)*scale,h-(py+(p[1]-view.minY)*scale)];
}
function unproject(px,py){
 const margin=32,w=canvas.width,h=canvas.height,
  sx=(w-2*margin)/(view.maxX-view.minX),
  sy=(h-2*margin)/(view.maxY-view.minY),
  scale=Math.min(sx,sy),
  ox=margin+(w-2*margin-(view.maxX-view.minX)*scale)/2,
  oy=margin+(h-2*margin-(view.maxY-view.minY)*scale)/2;
 return [(px-ox)/scale+view.minX,(h-py-oy)/scale+view.minY];
}
function drawGrid(){
 const w=canvas.width,h=canvas.height;
 ctx.fillStyle='#02101b';ctx.fillRect(0,0,w,h);
 ctx.strokeStyle='#21465a';ctx.lineWidth=1;
 for(let x=0;x<=w;x+=48){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
 for(let y=0;y<=h;y+=48){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
 ctx.fillStyle='#a7dced';ctx.font='16px sans-serif';
 ctx.fillText(map.coordinateMode==='LOCAL_RELATIVE'?
 'RELATIVE SCENE • UNCALIBRATED SIZE':'GEO / SURVEY DATA • SEE SOURCE RIGHTS',15,25);
}
function renderGeometry(g,color,fill=false){
 const p=pts(g);
 ctx.strokeStyle=color;ctx.fillStyle=color;
 if(g.type==='Point'){
  const [x,y]=project(p[0]);ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);
  ctx.fill();return;
 }
 ctx.beginPath();
 for(let i=0;i<p.length;i++){
  const [x,y]=project(p[i]);i?ctx.lineTo(x,y):ctx.moveTo(x,y);
 }
 if(g.type==='Polygon'){ctx.closePath();ctx.globalAlpha=.16;ctx.fill();ctx.globalAlpha=1;}
 ctx.lineWidth=g.type==='LineString'?5:2;ctx.stroke();
}
function draw(){
 drawGrid();
 for(const f of map.features){
  renderGeometry(f.geometry,colors[f.category]||'#e6f7ff');
  const p=pts(f.geometry)[0],[x,y]=project(p);
  ctx.fillStyle='#e7f5ff';ctx.font='13px sans-serif';ctx.fillText(f.name,x+10,y-7);
 }
 if(pending.length){
  ctx.strokeStyle='#ffffff';ctx.fillStyle='#f1f5ff';
  for(const p of pending){const [x,y]=project(p);ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();}
  if(pending.length>1)renderGeometry({type:'LineString',coordinates:pending},'#fafcfc');
 }
}
function options(){
 const refs=$('reference'),targets=$('target');
 refs.replaceChildren();targets.replaceChildren();
 for(const f of map.features){
  for(const el of [refs,targets]){
   const op=document.createElement('option');op.value=f.id;op.textContent=f.name+'（'+f.category+'）';el.append(op);
  }
 }
 if(map.features.length>=2)targets.selectedIndex=1;
 $('export').disabled=!map.features.length;
 $('finish').disabled=pending.length<2||$('category').value!=='road';
}
function refresh(){
 view=viewBounds();draw();options();
 const info=summarizeAIG712SceneMap(map);
 $('map-details').textContent=JSON.stringify(info,null,2);
 const div=$('entities');div.replaceChildren();
 if(!map.features.length){const p=document.createElement('small');p.textContent='尚無來源圖資，請標註或匯入。';div.append(p);}
 for(const f of map.features){
  const block=document.createElement('div');
  block.textContent=f.category+'｜'+f.name+'｜'+f.geometry.type+
   (f.metricGeometry?'｜局部米座標':'｜未定標相對座標');
  div.append(block);
 }
}
function addGeometry(geometry){
 const type=$('category').value;
 const value=$('feature-name').value.trim()||'來源標註';
 const featureId='annotation_'+(++serial);
 addAIG712SceneFeature(map,{id:featureId,name:value,category:type,geometry});
 pending=[];refresh();
 status('已新增 '+value+'。'+(map.physicalDimensionsKnown?
  '圖資座標依來源標示，GPS 匯入仍不是 3D 量測。':
  '這是相對圖面標註，並非 GPS 或真實毫米尺寸。'),true);
}
canvas.addEventListener('pointerdown',e=>{
 const rect=canvas.getBoundingClientRect(),
  x=(e.clientX-rect.left)*canvas.width/rect.width,
  y=(e.clientY-rect.top)*canvas.height/rect.height,
  pos=unproject(x,y),type=$('category').value;
 pending.push(pos);
 try{
  if(['tree','vehicle','landmark'].includes(type)){
   addGeometry({type:'Point',coordinates:pos});
  }else if(['building','house','sports_facility','water','other'].includes(type)){
   if(pending.length===2){
    const [a,b]=pending;
    const minX=Math.min(a[0],b[0]),maxX=Math.max(a[0],b[0]),
     minY=Math.min(a[1],b[1]),maxY=Math.max(a[1],b[1]);
    if(maxX-minX<.002||maxY-minY<.002)throw Error('RECTANGLE_TOO_SMALL');
    addGeometry({type:'Polygon',coordinates:[[
     [minX,minY],[maxX,minY],[maxX,maxY],[minX,maxY],[minX,minY]
    ]]});
   }else{draw();status('已記下第一個角，請在地圖點第二個角。',true);}
  }else{draw();options();status('已記下道路節點 '+pending.length+'；可繼續點擊或按完成。',true);}
 }catch(error){pending=[];refresh();status('BLOCKED：'+String(error.message||error));}
});
$('finish').addEventListener('click',()=>{
 try{
  if($('category').value!=='road'||pending.length<2)throw Error('TWO_ROAD_NODES_REQUIRED');
  addGeometry({type:'LineString',coordinates:[...pending]});
 }catch(error){status('BLOCKED：'+String(error.message||error));}
});
$('cancel').addEventListener('click',()=>{pending=[];draw();options();status('已取消本次點選，既有圖資保持不變。',true);});
$('category').addEventListener('change',()=>{pending=[];draw();options();});
$('clear').addEventListener('click',()=>{
 map=createAIG712SceneMap({sourceLabel:'USER_ANNOTATED_SCENE'});
 pending=[];serial=0;lastImported=false;refresh();$('comparison').textContent='請先建立至少兩項圖資。';
 status('已清空本輪場景圖資。未改變任何影片、CAD 或 CNC 原始資料。',true);
});
$('compare').addEventListener('click',()=>{
 try{
  const result=compareAIG712SceneFeaturePercent(map,{
   referenceId:$('reference').value,targetId:$('target').value,axis:$('axis').value
  });
  $('comparison').textContent=JSON.stringify(result,null,2);
  status('相對比例 '+result.apparentPercent.toFixed(2)+'%。'+
   (result.metricMapUnits?'座標來源為局部米制；仍需核對其實測性。':'來源未定標，不可宣稱真實毫米。'),true);
 }catch(e){status('BLOCKED：'+String(e.message||e));}
});
$('file').addEventListener('change',async()=>{
 const file=$('file').files?.[0];if(!file)return;
 try{
  if(file.size<1||file.size>1800000)throw Error('GEOJSON_MAX_1_8_MB');
  const data=JSON.parse(await file.text()),label=$('source-label').value.trim();
  if(!label)throw Error('MAP_SOURCE_REQUIRED');
  const imported=importAIG712GeoJSON(data,{
   sourceLabel:label,sourceRights:'USER_SUPPLIED_GEOJSON_LICENSE_TO_BE_CONFIRMED'
  });
  map=imported;pending=[];lastImported=true;serial=0;refresh();
  status('已匯入 '+map.features.length+' 筆 GeoJSON。座標換算使用局部近似投影，保留來源，未建立真 3D 人物。',true);
 }catch(e){status('BLOCKED：GeoJSON 不合法或座標範圍不支援：'+String(e.message||e));}
 finally{$('file').value='';}
});
$('export').addEventListener('click',async()=>{
 if(!map.features.length)return;
 const blob=new Blob([JSON.stringify(exportAIG712SceneMap(map),null,2)+'\n'],
  {type:'application/json'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='FastModel-7-12-source-scene-map.json';
 document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
 let lib=null;
 try{
  lib=await openAIG716AssetLibrary();
  await lib.importBlob(blob,{category:'map',title:'FastModel 7.12 場景地圖圖資',
   tags:['場景','地圖','建築','地理圖資'],
   source:'GENERATED_DERIVED',modelAccuracy:'NOT_VERIFIED',
   coordinateUnits:'UNKNOWN'});
  status('已輸出地圖圖資並自動保存在主程式外的分類素材庫；原 GeoJSON／座標來源保持不變。',true);
 }catch(e){
  status('已下載來源圖資；外部素材庫未能儲存：'+String(e.message||e),true);
 }finally{lib?.close()}
});
refresh();
