/** FastModel 7.12 CAD view scale only; world coordinates never scaled. */
import {createAIG712CADGrid,createAIG712CADDrawingScale,
 projectAIG712CADCoordinatesForDrawing,recoverAIG712CADWorldFromDrawing}
 from './aig-cad-grid-scale-7-12.mjs';
const $=id=>document.getElementById(id),canvas=$('grid'),
 ctx=canvas.getContext('2d'),number=id=>Number($(id).value);
const status=(s,pass)=>{$('status').textContent=s;$('status').dataset.pass=pass?'true':'false';};
function draw(scale,point,per){
 const {width:w,height:h}=canvas,ox=100,oy=h-85;
 const gridPx=scale.drawingCellMm*per;
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#020b18';ctx.fillRect(0,0,w,h);
 ctx.lineWidth=1;ctx.strokeStyle='#1e4158';
 if(gridPx>=8){
  for(let px=ox;px<w;px+=gridPx){
   ctx.beginPath();ctx.moveTo(px,10);ctx.lineTo(px,h);ctx.stroke();
  }
  for(let px=ox-gridPx;px>=0;px-=gridPx){
   ctx.beginPath();ctx.moveTo(px,10);ctx.lineTo(px,h);ctx.stroke();
  }
  for(let py=oy;py>=0;py-=gridPx){
   ctx.beginPath();ctx.moveTo(0,py);ctx.lineTo(w,py);ctx.stroke();
  }
  for(let py=oy+gridPx;py<=h;py+=gridPx){
   ctx.beginPath();ctx.moveTo(0,py);ctx.lineTo(w,py);ctx.stroke();
  }
 }
 ctx.lineWidth=2;ctx.strokeStyle='#55d8ed';
 ctx.beginPath();ctx.moveTo(ox,12);ctx.lineTo(ox,h-12);
 ctx.moveTo(13,oy);ctx.lineTo(w-13,oy);ctx.stroke();
 ctx.fillStyle='#8ceaff';ctx.font='15px sans-serif';ctx.fillText('X0.000 Y0.000',ox+5,oy+19);
 ctx.fillText('CAD 實物 '+scale.physicalCellMm.toFixed(3)+' mm／格',18,26);
 ctx.fillText('圖面 '+scale.label+'：'+scale.drawingCellMm.toFixed(3)+' mm／格',18,48);
 const x=ox+point.plotMm.x*per,y=oy-point.plotMm.y*per;
 ctx.strokeStyle='#94fad1';ctx.lineWidth=2;
 ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.stroke();
 ctx.beginPath();ctx.moveTo(x-13,y);ctx.lineTo(x+13,y);
 ctx.moveTo(x,y-13);ctx.lineTo(x,y+13);ctx.stroke();
 ctx.font='14px sans-serif';ctx.fillStyle='#b5fddb';
 ctx.fillText('實物 X'+point.actualMm.x.toFixed(3)+' Y'+point.actualMm.y.toFixed(3),
  Math.min(w-270,Math.max(15,x+16)),Math.max(70,y-14));
 ctx.fillStyle='#9bc1d4';ctx.fillText('縮尺僅作用圖面顯示；NC 真實座標保持不變',18,h-17);
}
function update(){
 const mm=number('cell-mm'),factor=number('ratio'),point={
  xMm:number('xmm'),yMm:number('ymm'),zMm:number('zmm')
 },pixels=number('pxmm');
 if(![mm,factor,point.xMm,point.yMm,point.zMm,pixels].every(Number.isFinite)||
  pixels<1||pixels>16)throw Error('CAD_GRID_VALUES_INVALID');
 if(!$('reviewed').checked)throw Error('PHYSICAL_CAD_GRID_NOT_REVIEWED');
 const physical=createAIG712CADGrid({cellMm:mm,
  physicalReferenceReviewed:true,matchedSourceReviewed:true});
 const drawing=createAIG712CADDrawingScale(physical,{denominator:factor});
 const proj=projectAIG712CADCoordinatesForDrawing(drawing,point);
 const recovered=recoverAIG712CADWorldFromDrawing(drawing,proj.plotMm);
 const maxError=Math.max(...['x','y','z'].map(axis=>
  Math.abs(recovered[axis+'Mm']-point[axis+'Mm'])));
 if(maxError>.0005)throw Error('CAD_SCALE_SOURCE_DIMENSION_DRIFT_BLOCKED');
 draw(drawing,proj,pixels);
 $('details').textContent=JSON.stringify({
  physicalCellMm:drawing.physicalCellMm,ratio:drawing.label,
  plotCellMm:drawing.drawingCellMm,
  originalWorldMm:proj.actualMm,plotMm:proj.plotMm,
  originalDimensionLabelsMm:proj.dimensionLabelMm,
  sourceRoundTripErrorMm:maxError,
  actualXYZPreserved:true,sourceGridReviewed:true,
  visibleGridIsOnlyRendering:true,
  source3DReconstructionFromGridPreview:false
 },null,2);
 status('CAD '+drawing.label+' 縮尺已套用；原始 XYZ（mm）維持不變。',true);
}
function refresh(){
 try{update();}catch(e){
  status('BLOCKED：'+String(e.message||e)+
   '。仍可檢視之前畫面，但不會產生新的已核准尺寸。',false);
  $('details').textContent='暫無本次核准的 CAD 縮尺數值。';
 }
}
$('apply').addEventListener('click',refresh);
for(const id of ['ratio','cell-mm','xmm','ymm','zmm','pxmm','reviewed'])
 $(id).addEventListener('change',refresh);
const defaults={schema:'CAD_SCALE_PREVIEW',ratio:'1:2',physicalCellMm:35};
ctx.fillStyle='#061523';ctx.fillRect(0,0,canvas.width,canvas.height);
ctx.fillStyle='#abcad9';ctx.font='18px sans-serif';ctx.fillText('請核對實物格線尺寸，選擇 1:2／1:4／1:10。',30,70);
$('details').textContent=JSON.stringify(defaults,null,2);
