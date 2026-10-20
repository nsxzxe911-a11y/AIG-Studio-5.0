/* AIG original geometry-driven hair guide dynamics and color/sketch projection. No AI pretrained models. */
(function (root) {
'use strict';
function clamp(x,a,b){return Math.max(a,Math.min(b,x));}
function faceWarp(p, region, intensity){
  if(region!=='face'||!intensity)return [p[0],p[1]];
  const x=p[0], y=p[1], strength=clamp(Number(intensity),0,100)/100;
  const cheek=clamp((y-202)/112,0,1), outline=clamp((Math.abs(x-654)-29)/85,0,1);
  const x1=654+(x-654)*(1-.053*strength*cheek*outline);
  const y1=y+2.6*strength*cheek;
  return [x1,y1];
}
function colorSketch(sourceCanvas,params={}){
  const w=sourceCanvas.width,h=sourceCanvas.height;
  const context=sourceCanvas.getContext('2d',{willReadFrequently:true});
  const source=context.getImageData(0,0,w,h),d=source.data;
  const dest=document.createElement('canvas');dest.width=w;dest.height=h;
  const dc=dest.getContext('2d'),out=dc.createImageData(w,h),o=out.data;
  const strength=clamp(params.strength===undefined?.7:params.strength,0,1);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=(y*w+x)*4;
    const x0=Math.max(0,x-1),x1=Math.min(w-1,x+1),y0=Math.max(0,y-1),y1=Math.min(h-1,y+1);
    const l=idx=>0.2126*d[idx]+0.7152*d[idx+1]+0.0722*d[idx+2];
    const gx=Math.abs(l((y*w+x1)*4)-l((y*w+x0)*4));
    const gy=Math.abs(l((y1*w+x)*4)-l((y0*w+x)*4));
    const edge=clamp((gx+gy-20)/85,0,1)*.62*strength;
    for(let c=0;c<3;c++){
      const v=d[i+c],colored=Math.round(v/14)*14;
      // Preserve image identity, use reduced-tone pastel and neutral pencil ink on edges.
      o[i+c]=clamp((v*(1-strength)+colored*strength)*(.99-.10*strength)*(1-edge)+13*edge,0,255);
    }
    o[i+3]=255;
  }
  dc.putImageData(out,0,0);return dest;
}
function initialPath(g,segments){
 const [x0,y0]=g.root,[x1,y1]=g.tip;
 return Array.from({length:segments},(_,i)=>{
  const t=i/(segments-1),bow=Math.sin(Math.PI*t)*g.curvature;
  return [x0+(x1-x0)*t+bow,y0+(y1-y0)*t+12*Math.sin(Math.PI*t)*Math.sin(g.phase)];
 });
}
class HairSolver {
 constructor(spec){
  if(spec.source.sha256!=='83b5728f34f6d3cc266d33e17fe259c44314b265fbf24d6d7a8eb971c316e910')throw Error('Authority SHA mismatch');
  if(spec.approved3DModel!==false||spec.gate?.aiModelAvailable!==false)throw Error('Fake approval blocked');
  this.spec=spec;this.frames=0;this.strands=spec.hair.strands.map(g=>{
    const rest=initialPath(g,spec.hair.segmentsPerStrand);
    return {g,rest,points:rest.map(x=>x.slice()),prev:rest.map(x=>x.slice())};
  });
 }
 step(dt,wind,headDegrees=0){
  dt=clamp(dt,0,1/30);wind=clamp(wind,-1,1);const scale=dt*60;
  const head=clamp(headDegrees,-12,12)*Math.PI/180;
  for(const s of this.strands){
   const root=s.rest[0],pivot=[654,181];
   const anchor=[pivot[0]+(root[0]-pivot[0])*Math.cos(head)+5*Math.sin(head),root[1]];
   s.points[0]=anchor.slice();s.prev[0]=anchor.slice();
   for(let j=1;j<s.points.length;j++){
    const t=j/(s.points.length-1),q=s.points[j],pr=s.prev[j],origin=s.rest[j];
    const force=wind*(8+13*t)*t+.26*Math.sin(this.frames*.06+s.g.phase+j*.17)*t;
    const goalX=origin[0]+(anchor[0]-root[0])*(1-.33*t)+force;
    const goalY=origin[1];
    const vx=clamp((q[0]-pr[0])*.72,-11,11),vy=clamp((q[1]-pr[1])*.72,-11,11);
    const next=[q[0]+vx+clamp((goalX-q[0])*.09*scale,-3,3),q[1]+vy+clamp((goalY-q[1])*.10*scale,-3,3)];
    s.prev[j]=q.slice();s.points[j]=next;
   }
   // Scalp is fixed, adjacent nodes remain locally bounded (prevents chain explosions).
   for(let j=1;j<s.points.length;j++){
    const limit=Math.hypot(s.rest[j][0]-s.rest[j-1][0],s.rest[j][1]-s.rest[j-1][1])*1.27;
    const p=s.points[j],parent=s.points[j-1],dx=p[0]-parent[0],dy=p[1]-parent[1],d=Math.hypot(dx,dy);
    if(d>limit){p[0]=parent[0]+dx*limit/d;p[1]=parent[1]+dy*limit/d;}
   }
  }
  this.frames++;
 }
 draw(ctx,opacity=0.75,facePolygon=null){
  ctx.save();
  if(facePolygon){ctx.beginPath();ctx.rect(0,0,ctx.canvas.width,ctx.canvas.height);
    ctx.moveTo(facePolygon[0][0],facePolygon[0][1]);
    facePolygon.slice(1).forEach(p=>ctx.lineTo(p[0],p[1]));
    ctx.closePath();ctx.clip('evenodd');}
  ctx.lineCap='round';ctx.lineJoin='round';
  const c=this.spec.hair.colorPalette;
  for(const s of this.strands){
   const pts=s.points;if(pts.length<2)continue;
   ctx.beginPath();ctx.moveTo(...pts[0]);
   for(let i=1;i<pts.length-1;i++){
    const m=[(pts[i][0]+pts[i+1][0])/2,(pts[i][1]+pts[i+1][1])/2];ctx.quadraticCurveTo(pts[i][0],pts[i][1],m[0],m[1]);
   }ctx.lineTo(...pts.at(-1));ctx.lineWidth=s.g.width;
   ctx.globalAlpha=(.28+.32*(s.g.colorIndex%3)/2)*opacity;
   ctx.strokeStyle=c[s.g.colorIndex];ctx.stroke();
  }ctx.restore();
 }
 maxMovement(){return this.strands.reduce((a,s)=>Math.max(a,Math.hypot(s.points.at(-1)[0]-s.rest.at(-1)[0],s.points.at(-1)[1]-s.rest.at(-1)[1])),0);}
}
const api={HairSolver,faceWarp,colorSketch,initialPath};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.AIGBeautyEngine=api;
})(typeof window!=='undefined'?window:undefined);