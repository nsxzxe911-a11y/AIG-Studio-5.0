import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AIG61_SCHEMA,proposeAIG61LocalLandmarks,
 acceptAIG61ReviewedProposal} from '../aig-face-scan-assist-6-1.mjs';
import {calibrateAIG60FaceMarks} from '../aig-face-alignment-6-0.mjs';

const source='a'.repeat(64),width=640,height=640;
function syntheticPhoto({flat=false,eyes=true}={}){
 const data=new Uint8ClampedArray(width*height*4);
 for(let i=0;i<data.length;i+=4){
  data[i]=220;data[i+1]=180;data[i+2]=150;data[i+3]=255;
 }
 if(flat)return data;
 function ellipse(cx,cy,rx,ry,color){
  for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++)
   for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++){
    if(x<0||y<0||x>=width||y>=height)continue;
    if(((x-cx)/rx)**2+((y-cy)/ry)**2>1)continue;
    const ix=(y*width+x)*4;
    data[ix]=color;data[ix+1]=color;data[ix+2]=color;
   }
 }
 if(eyes){
  ellipse(248,255,10,8,45);
  ellipse(392,255,10,8,47);
 }
 ellipse(320,334,8,7,85);
 ellipse(320,383,16,7,70);
 return data;
}
const params=(data=syntheticPhoto())=>({
 imageData:data,imageWidth:width,imageHeight:height,
 sourceImageSHA256:source,forehead:{x:320,y:150},chin:{x:320,y:450}
});
test('6.1 scans ACTUAL original RGBA pixel contrast within user-anchored face ROI, never invents accepted identity',()=>{
 const sourceData=syntheticPhoto(),sample=sourceData.slice();
 const result=proposeAIG61LocalLandmarks(params(sourceData));
 assert.equal(result.schema,AIG61_SCHEMA);
 assert.equal(result.sourceImageSHA256,source);
 assert.equal(result.analyzedRawPixelData,true);
 assert.equal(result.calibrated2DConstraintsValid,true);
 assert.equal(result.requiresExplicitUserVisualApproval,true);
 assert.equal(result.approvalGiven,false);
 assert.equal(result.candidateIsMeasuredLandmark,false);
 assert.equal(result.releaseAllowed,false);
 assert.ok(Math.abs(result.suggestedMarks.leftEye.x-248)<16);
 assert.ok(Math.abs(result.suggestedMarks.rightEye.x-392)<16);
 assert.ok(Math.abs(result.suggestedMarks.leftEye.y-255)<14);
 assert.ok(Math.abs(result.suggestedMarks.rightEye.y-255)<14);
 assert.ok(result.pixelEvidence.filter(x=>x.key.includes('Eye')).every(x=>x.score>=12));
 assert.deepEqual(sourceData,sample,'scan must not write pixels or create phantom source image');
});
test('6.1 uniform image, masked eyes, wrong source hash and non-frontal anchor fail closed',()=>{
 assert.throws(()=>proposeAIG61LocalLandmarks(params(syntheticPhoto({flat:true}))),
  /AIG61_LOW_EYE_CONTRAST/);
 assert.throws(()=>proposeAIG61LocalLandmarks(params(syntheticPhoto({eyes:false}))),
  /AIG61_LOW_EYE_CONTRAST/);
 assert.throws(()=>proposeAIG61LocalLandmarks({...params(),sourceImageSHA256:'bad'}),
  /AIG61_REAL_PIXELS_SOURCE/);
 assert.throws(()=>proposeAIG61LocalLandmarks({...params(),chin:{x:510,y:450}}),
  /AIG61_NONFRONTAL/);
 assert.throws(()=>proposeAIG61LocalLandmarks({...params(),imageData:new Uint8Array(40)}),
  /AIG61_REAL_PIXELS_SOURCE/);
});
test('6.1 proposal is never sufficient for 3D: explicit review and corrected point are required and 6.0 geometry validator still runs',()=>{
 const proposal=proposeAIG61LocalLandmarks(params());
 const options={imageWidth:width,imageHeight:height,sourceImageSHA256:source};
 assert.throws(()=>acceptAIG61ReviewedProposal(proposal,{...options,userConfirmed:false}),
  /AIG61_SOURCE_OR_HUMAN_REVIEW_REQUIRED/);
 assert.throws(()=>acceptAIG61ReviewedProposal(proposal,{...options,
  sourceImageSHA256:'b'.repeat(64),userConfirmed:true}),
  /AIG61_SOURCE_OR_HUMAN_REVIEW_REQUIRED/);
 const corrected=acceptAIG61ReviewedProposal(proposal,{...options,userConfirmed:true,
  corrections:{nose:{x:320,y:330}}});
 assert.equal(corrected.schema,AIG61_SCHEMA);
 assert.equal(corrected.reviewedMarks.nose.y,330);
 assert.deepEqual(corrected.manualCorrections,['nose']);
 assert.equal(corrected.sourceApproval,'USER_VISUALLY_CONFIRMED_PIXEL_PROPOSALS');
 assert.equal(corrected.calibration.sourcePhotoDepthNotMeasured,true);
 assert.equal(corrected.photo3DIdentityApproved,false);
 assert.equal(corrected.releaseAllowed,false);
 const validation=calibrateAIG60FaceMarks({
  imageWidth:width,imageHeight:height,sourceImageSHA256:source,
  marks:corrected.reviewedMarks});
 assert.equal(validation.photoIdentityVerified,false);
 assert.throws(()=>acceptAIG61ReviewedProposal(proposal,{...options,userConfirmed:true,
  corrections:{nose:{x:320,y:590}}}),/AIG60_LANDMARK_POSE/);
});
test('6.1 strict RGB real callback, source hash, manual 6.0 fallback, no regressions of voice/movie/GLB pipelines',()=>{
 const read=n=>fs.readFileSync(new URL('../'+n,import.meta.url),'utf8');
 const app=read('app.mjs'),html=read('index.html');
 for(const id of ['aig61-assist','aig61-edit-select','aig61-edit','aig61-accept','aig61-status'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 for(const id of ['aig61-assist','aig61-edit','aig61-accept'])
  assert.ok(app.includes("$('"+id+"').addEventListener('click'"),id);
 assert.ok(app.includes("aig61HandleCanvasPointer(event)"));
 assert.ok(app.includes('proposeAIG61LocalLandmarks({'));
 assert.ok(app.includes('acceptAIG61ReviewedProposal(aig61Proposal'));
 assert.ok(app.includes("sha256Bytes(await file.arrayBuffer())"));
 assert.ok(app.includes('!!aig61Proposal&&!aig61Review'));
 assert.ok(app.includes("aig61Invalidate('原圖或 5.9"));
 assert.ok(app.includes('candidateAssistant61UserReview:aig61Review'));
 assert.ok(app.includes('fitAIG60MeasuredFaceGLB('));
 assert.ok(app.includes('new MovieWorkspace('));
 assert.ok(app.includes('generateVoiceBatch('));
 assert.ok(app.includes('runAIG59BoundedAutoFit('));
});
