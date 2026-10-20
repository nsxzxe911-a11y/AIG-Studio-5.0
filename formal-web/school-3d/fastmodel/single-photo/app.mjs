import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {PhotoViewer,parseRiggedGLB} from './viewer.mjs';
import {buildPhotoSurface,photoMotion} from './photo-surface.mjs';
const $=id=>document.getElementById(id),status=$('status');
let view=null,bytes=null,mode='photo',busy=false;const links=[];
try{view=new PhotoViewer($('view'),m=>{$('viewport-status').textContent='預覽暫停：'+m;});}catch(e){$('viewport-status').textContent='此裝置無法啟用 WebGL；照片仍可轉換及下載 GLB。';}
function update(){const disabled=busy||!$('photo').files.length;$('generate').disabled=disabled;$('photo').disabled=busy;$('model').disabled=busy;}
function link(label,data,name,type){const url=URL.createObjectURL(new Blob([data],{type}));links.push(url);const a=document.createElement('a');a.className='download';a.textContent=label;a.href=url;a.download=name;$('downloads').append(a);}
async function load(buffer,label){
 if(view){const clips=await view.load(buffer);$('clip').replaceChildren();for(const c of clips){const o=document.createElement('option');o.value=c.index;o.textContent=c.name;$('clip').append(o);}$('clip').disabled=!clips.length;$('pause').disabled=!clips.length;$('pause').textContent='暫停動畫';}
 if(!view)await parseRiggedGLB(buffer);
 bytes=buffer;$('downloads').replaceChildren();links.splice(0).forEach(u=>URL.revokeObjectURL(u));link('下載動畫 GLB',buffer,mode==='photo'?'AIG-photo-relief-2_5D.glb':'AIG-imported.glb','model/gltf-binary');
 $('viewport-status').textContent=label;
}
async function photo(file){
 if(file.size>20*1024*1024)throw Error('請選擇 20 MB 以內的照片');
 if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('請選擇 PNG、JPEG 或 WebP 照片');
 const url=URL.createObjectURL(file),img=new Image();
 try{
  img.src=url;await img.decode();const w=img.naturalWidth,h=img.naturalHeight;
  if(!w||!h||w*h>40000000||w/h>100||h/w>100)throw Error('圖片尺寸超出限制（最多 4,000 萬像素）');
  const canvas=document.createElement('canvas'),scale=Math.min(1,1024/Math.max(w,h));canvas.width=Math.max(2,Math.round(w*scale));canvas.height=Math.max(2,Math.round(h*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
  const small=document.createElement('canvas');small.width=Math.max(2,Math.round(96*w/Math.max(w,h)));small.height=Math.max(2,Math.round(96*h/Math.max(w,h)));const ctx=small.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,small.width,small.height);
  const geometry=buildPhotoSurface(ctx.getImageData(0,0,small.width,small.height).data,small.width,small.height,w/h);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}),mesh=new THREE.Mesh(geometry,material);mesh.name='PhotoSurface';mesh.userData={representation:'2.5D brightness relief',hiddenSurfacesReconstructed:false,neuralDepth:false};
  const scene=new THREE.Scene();scene.add(mesh);
  try{return await new GLTFExporter().parseAsync(scene,{binary:true,animations:[photoMotion()],maxTextureSize:1024});}
  finally{geometry.dispose();material.dispose();texture.dispose();}
 }finally{URL.revokeObjectURL(url);}
}
$('photo').addEventListener('change',update);
$('generate').addEventListener('click',async()=>{const file=$('photo').files[0];if(!file||busy)return;busy=true;update();status.textContent='正在本機建立照片浮雕與擺動動畫…';try{const buffer=await photo(file);mode='photo';await load(buffer,'2.5D 照片浮雕 · 拖曳旋轉、雙指縮放 · 非完整人物 3D');status.textContent='已完成 2.5D 動畫，可下載 GLB。深度僅依明暗產生浮雕，背面、骨架與人物動作尚未重建；照片未上傳。';}catch(e){status.textContent='未完成：'+e.message;}finally{busy=false;update();}});
$('model').addEventListener('change',async()=>{const f=$('model').files[0];if(!f||busy)return;if(f.size>200*1024*1024){status.textContent='GLB 上限 200 MB';return;}busy=true;update();try{mode='glb';await load(await f.arrayBuffer(),'已載入 3D GLB · PBR 材質及原有動畫');status.textContent='已載入 GLB；只有檔案原有的動畫可播放，不會替靜態模型自動建立骨架。';}catch(e){status.textContent='GLB 未載入：'+e.message;}finally{busy=false;update();}});
$('clip').addEventListener('change',()=>view?.animation?.select(Number($('clip').value)));
$('pause').addEventListener('click',()=>{if(!view?.animation)return;view.animation.paused=!view.animation.paused;$('pause').textContent=view.animation.paused?'繼續動畫':'暫停動畫';});
if(window.AIG_OFFLINE){$('generation').hidden=true;mode=window.AIG_OFFLINE.mode;const buffer=Uint8Array.from(atob(window.AIG_OFFLINE.glb),c=>c.charCodeAt(0)).buffer;load(buffer,mode==='photo'?'離線 2.5D 照片浮雕動畫':'離線 GLB 動畫').catch(e=>{status.textContent=e.message;});status.textContent='離線播放；造型與實機 60 FPS 尚未驗收。';}
else status.textContent='可立即建立本機 2.5D 動畫。完整 3D 雲端重建尚未連接；此頁不收取生成費用。';
update();
