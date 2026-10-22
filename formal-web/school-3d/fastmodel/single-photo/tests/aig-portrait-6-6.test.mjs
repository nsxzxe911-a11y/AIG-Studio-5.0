import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AIG66_SCHEMA,segmentAIG66BorderRGBA,inferAIG66FaceBox,
 sampleAIG66LocalRig,createAIG66Portrait} from '../aig-portrait-6-6.mjs';
import {planAIG65AutoAnimation} from '../aig-auto-animation-6-5.mjs';
import {drawAIG65CanvasFrame} from '../aig-canvas-movie-6-5.mjs';
const hash='a'.repeat(64);
function portrait(){
 const width=100,height=160,data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4,inside=x>=33&&x<=67&&y>=19&&y<=146,
   shirt=x>=40&&x<=60&&y>=83&&y<=122;
  const v=inside&&!shirt?65:232;
  data[i]=v;data[i+1]=v;data[i+2]=v;data[i+3]=255;
 }
 return {width,height,data};
}
test('6.6 flood fill removes only border-connected RGB, preserving isolated same-color clothing',()=>{
 const pixels=portrait(),r=segmentAIG66BorderRGBA(pixels);
 assert.equal(r.valid,true);assert.equal(r.method,'BORDER_CONNECTED_RGB_FLOOD_MASK');
 const whiteShirt=(105*pixels.width+50)*4;
 assert.equal(r.foreground[whiteShirt+3],255,'white shirt is not erased');
 assert.equal(r.foreground[(4*pixels.width+3)*4+3],0,'outer background cleared');
 assert.equal(r.background[(40*pixels.width+50)*4],232,'foreground hole filled');
 assert.equal(r.actualDepthMeasured,false);
 assert.ok(r.subjectBox.height>80);
});
test('6.6 rejects non-uniform border or non-portrait object; avoids fake facial landmarks',()=>{
 const pix=portrait(),w=pix.width,h=pix.height;
 for(let y=0;y<7;y++)for(let x=0;x<7;x++){
  for(const xx of [x,w-1-x]){const p=(y*w+xx)*4;pix.data[p]=5;pix.data[p+1]=15;pix.data[p+2]=30;}
 }
 const r=segmentAIG66BorderRGBA(pix);
 assert.equal(r.valid,false);
 assert.equal(inferAIG66FaceBox({x:0,y:20,width:80,height:15},100,160),null);
 assert.equal(inferAIG66FaceBox({x:33,y:19,width:35,height:128},100,160).width>0,true);
 assert.throws(()=>segmentAIG66BorderRGBA({width:5000,height:5000,data:[]}),/AIG66_/);
});
test('6.6 local blink and jaw are deterministic and are not audio visemes',()=>{
 const blink=sampleAIG66LocalRig(1.26,{text:'「你好」'});
 const calm=sampleAIG66LocalRig(2.0,{text:'她轉身。'});
 assert.equal(blink.blink,1);
 assert.equal(calm.mouth,0);
 assert.ok(blink.mouth>0);
 assert.equal(blink.lipMotionSyncedToAudio,false);
 assert.equal(blink.actualFacialLandmarksDetected,false);
 assert.ok(blink.nodes.includes('MOUTH_PATCH'));
});
test('6.6 renders true pixels into local patch canvas while preserving 6.5 Canvas and 3D',()=>{
 const pix=portrait(),operations=[];
 const doc={createElement(type){
  assert.equal(type,'canvas');
  const c={width:300,height:150};
  const ctx={
   drawImage(...args){operations.push(['drawImage',args.length]);},
   clearRect(){operations.push(['clearRect']);},
   getImageData(){return pix;},
   createImageData(w,h){return {width:w,height:h,data:new Uint8ClampedArray(w*h*4)};},
   putImageData(){operations.push(['putImageData']);}
  };
  c.getContext=()=>ctx;return c;
 }};
 const face=createAIG66Portrait(doc,{width:100,height:160},null);
 assert.equal(face.evidence.schema,AIG66_SCHEMA);
 assert.equal(face.evidence.localNodesAvailable,true);
 assert.equal(face.evidence.realHeadNeckSkeletalDeformation,false);
 assert.equal(face.evidence.semanticSegmentation,false);
 assert.equal(face.evidence.backgroundHoleIsSynthesized,true);
 const patch=face.sample(1.26,{text:'「嗨」'});
 assert.ok(patch?.canvas&&patch.pose.blink===1);
 assert.ok(operations.filter(x=>x[0]==='drawImage').length>=4);
 const p=planAIG65AutoAnimation({hasImage:true,imageSHA256:hash,
  storyText:'「嗨」',requestedMode:'2D'});
 const drawn=[];
 const ctx={save(){},restore(){},fillRect(){},drawImage(...args){drawn.push(args);},
  translate(){},scale(){},rotate(){},fillText(){},set fillStyle(v){},
  set textAlign(v){},set font(v){}};
 const note=drawAIG65CanvasFrame({ctx,canvas:{width:960,height:540},
  plan:p,timeSeconds:1.26,layered:face.layers,portrait:face});
 assert.equal(note.localFacePixelsActuallyWarped,true);
 assert.equal(drawn.length,1,
  'Single image/face warp must not create a duplicate ghost under unverified background');
 assert.equal(note.actualHumanJointPositionsComputed,false);
});
test('6.6 RGB toggle and actual preview+film frame paths are wired; no new APIs or wardrobe removal',()=>{
 const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
 const app=read('app.mjs'),html=read('index.html');
 assert.equal((html.match(/id="aig66-face"/g)||[]).length,1);
 assert.ok(app.includes('createAIG66Portrait(document,bitmap,photoLayer)'));
 assert.equal((app.match(/portrait:aig66Portrait/g)||[]).length,4);
 assert.ok(app.includes('localPortraitEvidence:aig66Portrait?.evidence||null'));
 assert.ok(app.includes("new AIG65CanvasRecorder({"));
 assert.ok(app.includes("generateAIG64SinglePartialFullbody({analysis})"));
 assert.ok(app.includes("movieUI=new MovieWorkspace({"));
 assert.ok(html.includes('AIG FastModel 6.5｜'));
 assert.ok(html.includes('AIG FastModel 6.6｜'));
 assert.ok(!read('aig-portrait-6-6.mjs').includes('fetch('));
 assert.equal(JSON.parse(read('AIG62-SCHOOL-VISUAL-ASSETS.json')).otherCostumesAndSwimwearStillAvailable,true);
});
