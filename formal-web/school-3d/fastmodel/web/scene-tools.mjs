/**
 * FastModel 1.4 local geometry sampling and 2D reference scaffolds.
 * This is NOT image recognition, camera/LiDAR scanning, collision detection or rig IK.
 */
export const SCAN_KINDS=Object.freeze(['person','animal','plant','tree','water','sky','environment']);
export const LIGHT_PRESETS=Object.freeze({
 soft:{exposure:1.0,background:[.012,.017,.035]},
 daylight:{exposure:1.15,background:[.055,.09,.15]},
 dusk:{exposure:.78,background:[.09,.045,.12]},
 water:{exposure:.97,background:[.008,.065,.08]},
 sky:{exposure:1.07,background:[.06,.15,.23]}
});
export function limitAngle(value,limit=60){
 if(!Number.isFinite(value)||!Number.isFinite(limit)||limit<0||limit>180)throw Error('Invalid angle or range');
 return Math.max(-limit,Math.min(limit,value));
}
export function scanGeometry(file,readAccessor,{kind='person',maxSamples=12000}={}){
 if(!SCAN_KINDS.includes(kind))throw Error('Unknown scan kind');
 if(!Number.isInteger(maxSamples)||maxSamples<1||maxSamples>100000)throw Error('Unsafe scan budget');
 if(!file?.g?.meshes||typeof readAccessor!=='function')throw Error('No loaded GLB geometry');
 const primitives=file.g.meshes.flatMap(m=>m.primitives||[]).filter(p=>p?.attributes?.POSITION!==undefined);
 const total=primitives.reduce((n,p)=>n+(file.g.accessors?.[p.attributes.POSITION]?.count||0),0);
 if(!total)throw Error('GLB has no position vertices');
 const stride=Math.max(1,Math.ceil(total/maxSamples));
 let samples=0,triangles=0,invalid=0;
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(const p of primitives){
   const acc=file.g.accessors[p.attributes.POSITION];
   if(!acc||acc.type!=='VEC3')throw Error('Unsupported position accessor');
   const pos=readAccessor(file,p.attributes.POSITION);
   for(let i=0;i<acc.count;i+=stride){
     let good=true;
     for(let j=0;j<3;j++)if(!Number.isFinite(pos[3*i+j]))good=false;
     if(!good){invalid++;continue;}
     for(let j=0;j<3;j++){lo[j]=Math.min(lo[j],pos[3*i+j]);hi[j]=Math.max(hi[j],pos[3*i+j]);}
     samples++;
   }
   const indices=p.indices===undefined?acc.count:(file.g.accessors[p.indices]?.count||0);
   if((p.mode??4)===4)triangles+=Math.floor(indices/3);
 }
 if(samples===0)throw Error('All sampled points invalid');
 const extent=hi.map((n,i)=>n-lo[i]);
 return Object.freeze({
  source:'LOADED_GLB_VERTEX_SAMPLING',kind,semanticsRecognized:false,
  vertices:total,primitives:primitives.length,triangles,samples,invalidSamples:invalid,
  sampleStride:stride,approximateBounds:true,
  sampledMin:lo,sampledMax:hi,sampledExtent:extent,
  materialCount:file.g.materials?.length||0,animationCount:file.g.animations?.length||0
 });
}
export function supportPoints(bounds,{yaw=0,pitch=0,limit=60}={}){
 if(!bounds?.min||!bounds?.max)throw Error('No model bounds for scaffold');
 const az=limitAngle(yaw,limit)*Math.PI/180,el=limitAngle(pitch,limit)*Math.PI/180;
 const lo=bounds.min,hi=bounds.max,c=lo.map((x,i)=>(x+hi[i])/2);
 const h=Math.max(1e-3,hi[1]-lo[1]), length=h*.27;
 const anchor=[c[0],lo[1]+h*.66,c[2]];
 const tip=[anchor[0]+length*Math.cos(el)*Math.sin(az),
            anchor[1]+length*Math.sin(el),
            anchor[2]+length*Math.cos(el)*Math.cos(az)];
 return {foot:[c[0],lo[1],c[2]],anchor,tip,
  yaw:limitAngle(yaw,limit),pitch:limitAngle(pitch,limit),limit,
  referenceOnly:true};
}
export function projectGuide(p,{center,angle,zoom,zoomFactor,width,height},cssWidth,cssHeight){
 if(!(width>0&&height>0&&cssWidth>0&&cssHeight>0))throw Error('Invalid viewport');
 const x=p[0]-center[0],z=p[2]-center[2];
 const xp=Math.cos(angle)*x+Math.sin(angle)*z;
 const ndcx=xp*zoom*zoomFactor/(width/height);
 const ndcy=(p[1]-center[1])*zoom*zoomFactor;
 return [(ndcx+1)*cssWidth*.5,(1-ndcy)*cssHeight*.5];
}
export function paintScaffold(canvas,view,opts={}){
 if(!canvas||!view?.bound)return null;
 const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return null;
 const dpr=Math.max(1,Math.min(2,typeof devicePixelRatio==='number'?devicePixelRatio:1));
 const pixelW=Math.round(w*dpr),pixelH=Math.round(h*dpr);
 if(canvas.width!==pixelW)canvas.width=pixelW;
 if(canvas.height!==pixelH)canvas.height=pixelH;
 const ctx=canvas.getContext('2d');
 if(!ctx)return null;
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 if(!opts.enabled)return null;
 const pts=supportPoints(view.bound,opts);
 const project=p=>projectGuide(p,view,w,h);
 const foot=project(pts.foot),anchor=project(pts.anchor),tip=project(pts.tip);
 ctx.lineWidth=1.7;ctx.strokeStyle='#65dbf7';ctx.setLineDash([6,5]);
 ctx.beginPath();ctx.moveTo(...foot);ctx.lineTo(...anchor);ctx.lineTo(...tip);ctx.stroke();
 ctx.setLineDash([]);ctx.fillStyle='#ffb9dd';
 for(const xy of [anchor,tip]){ctx.beginPath();ctx.arc(xy[0],xy[1],3,0,Math.PI*2);ctx.fill();}
 ctx.font='11px sans-serif';ctx.fillStyle='#bcf5ff';ctx.fillText('參考支架 ±'+pts.limit+'°',Math.max(4,Math.min(w-110,anchor[0]+9)),Math.max(15,anchor[1]-9));
 return pts;
}
