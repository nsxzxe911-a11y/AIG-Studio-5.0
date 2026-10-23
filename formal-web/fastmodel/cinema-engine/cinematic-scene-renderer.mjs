/**
 * Star Journey procedural 2D scene art - actual Canvas pixels and motion.
 * Source: local code-drawn sci-fi illustration, NOT generated human/3D mesh.
 * Visuals exist specifically to test story/shot camera/editor/export pipeline.
 */
const hash=i=>{
 let x=(i+137)*2654435761>>>0;
 x^=x>>>16;x=Math.imul(x,2246822507);x^=x>>>13;
 return (x>>>0)/4294967295;
};
function glow(ctx,x,y,r,color){
 const g=ctx.createRadialGradient(x,y,0,x,y,r);
 g.addColorStop(0,color);g.addColorStop(1,'#00000000');
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
}
function ellipseStroke(ctx,x,y,rx,ry,color,thick=2,rotation=0){
 ctx.save();ctx.translate(x,y);ctx.rotate(rotation);
 ctx.strokeStyle=color;ctx.lineWidth=thick;
 ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.stroke();
 ctx.restore();
}
function background(ctx,w,h,key,t){
 const palettes={
  GATE:['#04071e','#17245c','#1d2362'],
  PORT:['#030b24','#19324c','#183054'],
  FLEET:['#02091e','#15365e','#0d1f42'],
  PLANET:['#020b26','#0d3656','#172358'],
  NEBULA:['#09071d','#322158','#102d59']
 };
 const p=palettes[key]??palettes.NEBULA;
 const g=ctx.createLinearGradient(0,0,w,h);
 g.addColorStop(0,p[0]);g.addColorStop(.5,p[1]);g.addColorStop(1,p[2]);
 ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 glow(ctx,w*.60,h*.42,w*.56,'#633edb18');
 glow(ctx,w*.16,h*.28,w*.5,'#007dff18');
 for(let i=0;i<165;i++){
  const px=hash(i*19)*w,py=hash(i*13+17)*h;
  const phase=(t*.003*(i%6+1))%1;
  const alpha=.2+hash(i*5+2)*.6;
  ctx.fillStyle=i%9===0?'#e9b4ff':'#c6eaff';
  ctx.globalAlpha=alpha*(.85+.15*Math.sin(phase*6.283));
  ctx.beginPath();ctx.arc(px,py,.45+(i%11===0?1.2:.25),0,Math.PI*2);
  ctx.fill();
 }
 ctx.globalAlpha=1;
}
function planet(ctx,x,y,r,key){
 glow(ctx,x,y,r*1.9,key==='PLANET'?'#26a4ff40':'#768cff34');
 const g=ctx.createRadialGradient(x-r*.35,y-r*.5,r*.03,x,y,r);
 g.addColorStop(0,key==='PLANET'?'#a4f6ff':'#b3cbf0');
 g.addColorStop(.42,key==='PLANET'?'#3f90c7':'#4b76b6');
 g.addColorStop(.78,'#14295b');g.addColorStop(1,'#070d25');
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
 ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.clip();
 for(let k=0;k<8;k++){
  ctx.strokeStyle=k%2===0?'#72d4ff26':'#adc2ff25';
  ctx.lineWidth=r*(k%3===0?.055:.025);
  ctx.beginPath();
  ctx.ellipse(x+r*.08,y+r*(-.5+k*.14),
   r*1.05,r*.18,-.18,0,Math.PI*2);ctx.stroke();
 }
 ctx.restore();
}
function ship(ctx,x,y,size,t){
 ctx.save();ctx.translate(x,y);ctx.rotate(-.14+Math.sin(t*.9)*.01);
 glow(ctx,-size*.46,0,size*.52,'#25e8ff6a');
 ctx.fillStyle='#293f66';ctx.strokeStyle='#89c5f5';ctx.lineWidth=Math.max(1,size*.022);
 ctx.beginPath();
 ctx.moveTo(size*.62,0);ctx.lineTo(size*.12,-size*.14);
 ctx.lineTo(-size*.22,-size*.11);ctx.lineTo(-size*.5,-size*.30);
 ctx.lineTo(-size*.32,-size*.06);ctx.lineTo(-size*.53,0);
 ctx.lineTo(-size*.32,size*.07);ctx.lineTo(-size*.5,size*.30);
 ctx.lineTo(-size*.22,size*.12);ctx.lineTo(size*.12,size*.14);
 ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle='#77f2ff';ctx.fillRect(-size*.54,-size*.06,size*.1,size*.04);
 ctx.fillRect(-size*.54,size*.025,size*.1,size*.04);
 ctx.restore();
}
function gate(ctx,w,h,t){
 const x=w*.62,y=h*.47,size=Math.min(w*.29,h*.61);
 glow(ctx,x,y,size*1.5,'#1c9aff36');
 for(let j=0;j<5;j++){
  const rx=size*(.6+j*.15),ry=size*(.85+j*.14);
  ellipseStroke(ctx,x,y,rx,ry,j%2===0?'#6bdfff8c':'#b17aff86',
   size*(j%2===0?.025:.014),-.27);
 }
 ellipseStroke(ctx,x,y,size*.54,size*.8,'#fff0ffd9',size*.017,-.27);
 for(let i=0;i<20;i++){
  const a=i*Math.PI*2/20+t*.16;
  const xx=x+Math.cos(a)*size*.54,yy=y+Math.sin(a)*size*.8;
  glow(ctx,xx,yy,size*.065,'#50dfffa8');
 }
 ship(ctx,w*.29+(t*.02*w),h*.57,size*.74,t);
}
function port(ctx,w,h,t){
 planet(ctx,w*.79,h*.18,h*.30,'PORT');
 const horizon=h*.73;
 for(let i=0;i<56;i++){
  const x=(i/56)*w,ht=h*(.10+hash(i*5+6)*.36);
  ctx.fillStyle=i%3===0?'#1d365f':'#0c203e';
  ctx.fillRect(x,horizon-ht,w/70+6,ht+h*.34);
  ctx.fillStyle=i%3===0?'#2df0ff':'#cf8aff';
  for(let k=0;k<Math.floor(ht/17);k++)
   if(hash(i*73+k*11)>.40)ctx.fillRect(x+4,horizon-ht+7+k*17,2,4);
 }
 ctx.fillStyle='#071626';ctx.beginPath();ctx.moveTo(0,h);
 ctx.lineTo(0,horizon);ctx.lineTo(w*.18,horizon-h*.09);
 ctx.lineTo(w*.38,horizon);ctx.lineTo(w*.75,horizon-h*.03);
 ctx.lineTo(w,horizon);ctx.lineTo(w,h);ctx.fill();
 ship(ctx,w*.40+(t*.012*w),h*.36,w*.17,t);
}
function fleet(ctx,w,h,t){
 planet(ctx,w*.78,h*.43,h*.36,'FLEET');
 for(let k=0;k<6;k++){
  ship(ctx,w*(.16+hash(k*6+8)*.67)+t*w*.008,
   h*(.2+hash(k*19+3)*.48),
   w*(.05+hash(k*2+9)*.1),t+k);
 }
 glow(ctx,w*.36,h*.61,w*.2,'#10b5ff26');
}
function world(ctx,w,h,t){
 planet(ctx,w*.62,h*.37,h*.43,'PLANET');
 ctx.fillStyle='#061528';
 ctx.beginPath();ctx.moveTo(0,h*.78);
 for(let i=0;i<=12;i++){
  const x=i*w/12,y=h*(.77-hash(i*8+1)*.22);
  ctx.lineTo(x,y);
 }
 ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();
 glow(ctx,w*.56,h*.36,w*.28,'#6ad8ff13');
 ship(ctx,w*.21+t*w*.006,h*.29,w*.09,t);
}
function nebula(ctx,w,h,t){
 glow(ctx,w*.40,h*.40,w*.48,'#c073ff3b');
 glow(ctx,w*.59,h*.30,w*.31,'#1974ff60');
 glow(ctx,w*.72,h*.65,w*.48,'#00badf21');
 for(let i=0;i<18;i++){
  const a=i*.68+t*.02,r=w*(.05+hash(i*9)*.28);
  glow(ctx,w*.5+Math.cos(a)*r,h*.48+Math.sin(a)*r*.58,w*.08,'#6c8dff14');
 }
 planet(ctx,w*.82,h*.56,h*.25,'NEBULA');
}
function title(ctx,shot,w,h){
 const f=Math.max(13,Math.round(w*.023));
 ctx.textAlign='left';ctx.font='600 '+f+'px system-ui';
 ctx.fillStyle='#c9f7ff';ctx.shadowColor='#0bcaf6';ctx.shadowBlur=8;
 ctx.fillText('星際之旅  /  '+shot.id,Math.round(w*.047),Math.round(h*.11));
 ctx.shadowBlur=0;
 ctx.font='500 '+Math.max(12,Math.round(w*.017))+'px system-ui';
 ctx.fillStyle='#add1e6';
 ctx.fillText(shot.title+'  •  '+shot.camera,Math.round(w*.047),Math.round(h*.17));
}
export function renderAIGStarJourneyShot(ctx,shot,offset,width,height){
 if(!ctx||!shot||!Number.isFinite(offset)||width<1||height<1)
  throw Error('STARJOURNEY_CANVAS_SHOT_INPUT');
 const duration=shot.durationSec||3;
 const p=Math.max(0,Math.min(1,offset/duration));
 ctx.save();ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();
 // True camera drift is an actual 2D transform, not purported 3D.
 const pan=(p-.5)*width*.024,zoom=1+.025*p;
 ctx.translate(width/2,height/2);ctx.scale(zoom,zoom);
 ctx.translate(-width/2-pan,-height/2);
 background(ctx,width,height,shot.visualKey,p);
 switch(shot.visualKey){
  case 'GATE':gate(ctx,width,height,p);break;
  case 'PORT':port(ctx,width,height,p);break;
  case 'FLEET':fleet(ctx,width,height,p);break;
  case 'PLANET':world(ctx,width,height,p);break;
  default:nebula(ctx,width,height,p);
 }
 ctx.restore();
 // Fade only at shot edges, preserving actual visible footage frames.
 const fadeIn=Math.min(1,offset/.38);
 const fadeOut=Math.min(1,(duration-offset)/.38);
 ctx.fillStyle='#020407';
 ctx.globalAlpha=1-Math.max(0,Math.min(fadeIn,fadeOut));
 ctx.fillRect(0,0,width,height);ctx.globalAlpha=1;
 title(ctx,shot,width,height);
}
