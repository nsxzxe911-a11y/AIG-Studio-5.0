import test from 'node:test';
import assert from 'node:assert/strict';
import {AIG79_SCHEMA,AIG79_MODES,createAIG79ContinuousScan,setAIG79ScanState,
 scanAIG79Frame,summarizeAIG79Scan,exportAIG79Memory,importAIG79Memory
} from '../aig-continuous-scan-7-9.mjs';

function frame(phase=0,kind='normal'){
 const width=72,height=72,data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const at=(y*width+x)*4;
  const on=((Math.floor((x+phase*5)/9)+Math.floor((y+phase*2)/9))%2)===0;
  let c=on?215:38;
  if(kind==='black')c=0;
  if(kind==='white')c=255;
  if(kind==='gray')c=112;
  if(kind==='dark')c=on?21:5;
  data.set([c,c,c,255],at);
 }
 return {width,height,data};
}
test('7.9 initialize session with offline-only video and camera modes',()=>{
 const video=createAIG79ContinuousScan();
 assert.equal(video.schema,AIG79_SCHEMA);
 assert.deepEqual(AIG79_MODES,['video','camera']);
 assert.equal(video.config.maxKeyframes,24);
 assert.equal(video.rawSourcePhotoPersisted,false);
 assert.equal(video.continuousModelTrainingCompleted,false);
 const cam=createAIG79ContinuousScan({mode:'camera'});
 assert.equal(cam.mode,'camera');
 assert.throws(()=>createAIG79ContinuousScan({mode:'server'}),/SOURCE_INVALID/);
 assert.throws(()=>createAIG79ContinuousScan({config:{maxKeyframes:800}}),/CONFIG_INVALID/);
});
test('7.9 continuous scan filters duplicate, dark, flat and too-close samples',()=>{
 const s=createAIG79ContinuousScan({sourceId:'sha256:'+'a'.repeat(64)});
 assert.equal(scanAIG79Frame(s,{image:frame(),timeMs:0}).reason,'NOT_SCANNING');
 setAIG79ScanState(s,'scanning');
 assert.equal(scanAIG79Frame(s,{image:frame(),timeMs:0}).accepted,true);
 assert.equal(scanAIG79Frame(s,{image:frame(1),timeMs:40}).reason,'THROTTLED');
 assert.equal(scanAIG79Frame(s,{image:frame(0),timeMs:300}).reason,'DUPLICATE');
 assert.equal(scanAIG79Frame(s,{image:frame(0,'dark'),timeMs:600}).reason,'DARK');
 assert.equal(scanAIG79Frame(s,{image:frame(0,'gray'),timeMs:900}).reason,'LOW_CONTRAST');
 assert.ok(s.framesRejected>=4);assert.equal(s.keyframes.length,1);
 assert.ok(s.keyframes[0].descriptor.length===144);
});
test('7.9 continuous metadata, paused/resume, source checking and safe stop',()=>{
 const s=createAIG79ContinuousScan({mode:'video',sourceId:'sha256:'+'b'.repeat(64)});
 setAIG79ScanState(s,'scanning');
 const a=scanAIG79Frame(s,{image:frame(0),timeMs:0});
 assert.ok(a.accepted);assert.equal(a.quality.angleVerified,false);
 setAIG79ScanState(s,'paused');
 assert.equal(scanAIG79Frame(s,{image:frame(2),timeMs:400}).reason,'NOT_SCANNING');
 setAIG79ScanState(s,'scanning');
 assert.throws(()=>scanAIG79Frame(s,{image:frame(1),timeMs:-1}),/TIME_INVALID/);
 assert.throws(()=>scanAIG79Frame(s,{image:frame(1),timeMs:200,pose:{yaw:3,pitch:0}}),/POSE_REVIEW_INVALID/);
 const b=scanAIG79Frame(s,{image:frame(3),timeMs:440,pose:{yaw:.5,pitch:.06,reviewed:true}});
 assert.ok(b.accepted);
 const summary=summarizeAIG79Scan(s);
 assert.equal(summary.reviewedPoses,1);
 assert.equal(summary.cameraPoseSolvedAutomatically,false);
 assert.equal(summary.full3DHeadRecovered,false);
 const exported=exportAIG79Memory(s);
 assert.equal(exported.originalVideoFramesSaved,false);
 assert.ok(!JSON.stringify(exported).includes('"data"'));
 const restored=importAIG79Memory(exported,{requiredSourceId:s.sourceId});
 assert.equal(restored.state,'paused');
 assert.equal(restored.keyframes.length,2);
 assert.throws(()=>importAIG79Memory(exported,{requiredSourceId:'wrong'}),/SOURCE_MISMATCH/);
 setAIG79ScanState(s,'stopped');
 assert.throws(()=>setAIG79ScanState(s,'scanning'),/STOPPED_START_NEW_SESSION/);
});
test('7.9 bounded model memory and replacement never exceed keyframe budget',()=>{
 const s=createAIG79ContinuousScan({mode:'camera',config:{maxKeyframes:4,noveltyThreshold:.01,minIntervalMs:100}});
 setAIG79ScanState(s,'scanning');
 for(let i=0;i<28;i++)scanAIG79Frame(s,{image:frame(i),timeMs:i*180});
 assert.ok(s.keyframes.length>=2);
 assert.ok(s.keyframes.length<=4);
 assert.ok(s.framesAccepted>=s.keyframes.length);
 assert.ok(s.framesReplaced>=0);
 assert.equal(summarizeAIG79Scan(s).cacheLimit,4);
 assert.ok(s.keyframes.every(x=>x.depthMeasured===false));
});
test('7.9 malformed frame buffers and tampered JSON memory fail closed',()=>{
 const s=createAIG79ContinuousScan();
 setAIG79ScanState(s,'scanning');
 assert.throws(()=>scanAIG79Frame(s,{timeMs:0,image:{width:80,height:80,data:new Uint8Array(3)}}),/RGBA_DIMENSION/);
 assert.equal(scanAIG79Frame(s,{timeMs:0,image:frame(0)}).accepted,true);
 assert.throws(()=>scanAIG79Frame(s,{timeMs:-2,image:frame(0)}),/TIME_INVALID/);
});
test('7.9 imported metadata cannot claim measured pose or smuggle raw images',()=>{
 const s=createAIG79ContinuousScan({sourceId:'fixed'});
 setAIG79ScanState(s,'scanning');
 scanAIG79Frame(s,{image:frame(),timeMs:0});
 const p=exportAIG79Memory(s);
 p.keyframes[0].descriptor[0]=Infinity;
 assert.throws(()=>importAIG79Memory(p,{requiredSourceId:'fixed'}),/MEMORY_FRAME_INVALID/);
});
