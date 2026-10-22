import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AIG_SOURCE_OBSERVATION_SCHEMA,inspectAigSourceObservation}
 from '../aig-source-observation-6-12.mjs';

const w=320,h=480,SHA='e'.repeat(64);
function input({kind='upper',transparent=false,contrast=true}={}){
 const pixels=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=4*(y*w+x);
  pixels[i]=238;pixels[i+1]=235;pixels[i+2]=230;
  pixels[i+3]=transparent?0:255;
  const center=kind==='multiple'?[100,220]:[160];
  const body=center.some(cx=>((x-cx)/((kind==='multiple')?31:75))**2+
   ((y-275)/((kind==='multiple')?105:140))**2<=1);
  const head=kind==='upper'&&((x-160)/38)**2+((y-110)/69)**2<=1;
  if(body||head){
   pixels[i]=contrast?68:238;
   pixels[i+1]=contrast?53:235;
   pixels[i+2]=contrast?52:230;
   pixels[i+3]=255;
  }
 }
 return {pixels,imageWidth:w,imageHeight:h,sourceImageSHA256:SHA};
}
test('6.12 measures actual single-image silhouette bands and RGB but never fabricates source skin/rig/depth',()=>{
 const a=inspectAigSourceObservation(input());
 assert.equal(a.schema,AIG_SOURCE_OBSERVATION_SCHEMA);
 assert.equal(a.domain,'HUMAN');
 assert.equal(a.domainDecisionSource,'EXPLICIT_USER_CHOICE_NOT_AI_SPECIES_RECOGNITION');
 assert.equal(a.segmentationMethod,'UNIFORM_BORDER_COLOUR_KEY');
 assert.equal(a.measuredForegroundMedianRGB[0],68);
 assert.ok(a.mainForegroundAreaFraction>.025);
 assert.equal(a.observedSilhouetteBands.length,11);
 assert.ok(a.observedSilhouetteBands.some(x=>x.widthPixels>30));
 assert.equal(a.foregroundBox.x0>0,true);
 assert.equal(a.sourceMeasuredRealWorldLength,undefined);
 assert.equal(a.speciesOrAnatomicalKeypointsVerified,false);
 assert.equal(a.rgbMeasuredNotTrueSkinOrFurOrLeafAlbedo,true);
 assert.equal(a.actualSoftTissueElasticityMeasured,undefined);
 assert.equal(a.physicalSkinElasticityMeasured,false);
 assert.equal(a.true3DDepthFromSingleRGBMeasured,false);
 assert.equal(a.releaseAllowed,false);
});
test('6.12 animal and plant use their explicit domain, no fake human skeleton or ready species GLB',()=>{
 for(const domain of ['ANIMAL','PLANT']){
  const a=inspectAigSourceObservation({...input(),domain});
  assert.equal(a.domain,domain);
  assert.equal(a.nonHuman3DGenerationReady,false);
  assert.equal(a.speciesOrAnatomicalKeypointsVerified,false);
  assert.equal(a.physicalSkinElasticityMeasured,false);
 }
});
test('6.12 uses transparent foreground alpha, not made-up border colour',()=>{
 const a=inspectAigSourceObservation(input({transparent:true}));
 assert.equal(a.segmentationMethod,'ORIGINAL_IMAGE_ALPHA');
 assert.equal(a.backgroundMedianRGB,null);
 assert.equal(a.measuredForegroundMedianRGB[0],68);
});
test('6.12 rejects multiple prominent disconnected subjects and images with no real foreground',()=>{
 assert.throws(()=>inspectAigSourceObservation(input({kind:'multiple'})),
  /MULTIPLE_DOMINANT_SUBJECTS/);
 assert.throws(()=>inspectAigSourceObservation(input({contrast:false})),
  /NO_RELIABLE_FOREGROUND_SUBJECT/);
});
test('6.12 rejects unsupported domains and source identity mismatch',()=>{
 assert.throws(()=>inspectAigSourceObservation({...input(),domain:'UNKNOWN'}),
  /EXPLICIT_BIOLOGICAL_DOMAIN_REQUIRED/);
 assert.throws(()=>inspectAigSourceObservation({...input(),sourceImageSHA256:'x'}),
  /INVALID_SOURCE_IMAGE/);
 const bad=input();bad.pixels[0]=0;
 // Every pixel should be finite but first pixel alone is not enough to
 // classify nonuniform background; test alternation at the image rim.
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(
  x<23||x>=w-23||y<23||y>=h-23){
  const i=4*(y*w+x),tone=(Math.floor(x/19)+Math.floor(y/19))%2?0:255;
  bad.pixels[i]=tone;bad.pixels[i+1]=tone;bad.pixels[i+2]=tone;
 }
 assert.throws(()=>inspectAigSourceObservation(bad),
  /COMPLEX_BACKGROUND_REQUIRES_REAL_SEGMENTATION/);
});
test('6.12 real app pipeline observes pixels BEFORE human prior, offers bounded non-human evidence',()=>{
 const app=readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.equal((html.match(/id="aig64-subject-kind"/g)||[]).length,1);
 assert.ok(html.includes('<option value="HUMAN" selected>'));
 assert.ok(html.includes('<option value="ANIMAL">'));
 assert.ok(html.includes('<option value="PLANT">'));
 assert.equal((html.match(/id="aig64-observation-status"/g)||[]).length,1);
 assert.ok(app.indexOf('const observation=inspectAigSourceObservation({')<
  app.indexOf('const analysis=analyzeAIG64PartialPortrait({'));
 assert.ok(app.includes("if(domain!=='HUMAN'){"));
 assert.ok(app.includes('actualPixelColourAndShapeObservation:observation'));
 assert.ok(app.includes("aig64SingleBytes=null;"));
 assert.ok(app.includes("$('aig64-single-download').disabled=true;"));
 assert.ok(app.includes('nonHuman3DGenerationReady:false')===false);
});
