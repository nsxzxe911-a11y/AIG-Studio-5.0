import test from 'node:test';
import assert from 'node:assert/strict';
import {selectAnimationTracks} from '../web/animation-clips.mjs';
import {createPoseEvaluator} from '../web/pose-evaluator.mjs';
import {FastModelView} from '../web/renderer.mjs';

function fixture(){
 const values=[[0,1],[0,0,0,1,0,0,Math.SQRT1_2,Math.SQRT1_2],[0,0,0,1,0,0,0,1]];
 const clip=output=>({samplers:[{input:0,output,interpolation:'LINEAR'}],channels:[{sampler:0,target:{node:0,path:'rotation'}}]});
 return {file:{g:{nodes:[{children:[1]},{translation:[1,0,0]}],animations:[clip(1),clip(2)]}},reader:(_f,id)=>values[id]};
}
test('selected real clip drives pose without mixing alternate clips or changing source',()=>{
 const {file,reader}=fixture(),before=JSON.stringify(file.g);
 const a=selectAnimationTracks(file,reader,0),b=selectAnimationTracks(file,reader,1);
 assert.equal(a.tracks.length,1);assert.equal(a.duration,1);
 const first=createPoseEvaluator(file.g.nodes,a.tracks).evaluate(.5);
 const second=createPoseEvaluator(file.g.nodes,b.tracks).evaluate(.5);
 assert.ok(first[1][13]>.7);assert.equal(second[1][13],0);
 assert.equal(JSON.stringify(file.g),before);
});
test('invalid clips and unsupported channels are rejected before changing current pose',()=>{
 const {file,reader}=fixture();
 assert.throws(()=>selectAnimationTracks(file,reader,4),/ANIMATION_CLIP_INDEX/);
 file.g.animations[0].channels.push(file.g.animations[0].channels[0]);
 assert.throws(()=>selectAnimationTracks(file,reader,0),/DUPLICATE_NODE_ANIMATION_TRACK/);
 file.g.animations[0].channels.pop();
 file.g.animations[0].channels[0].target.path='translation';
 assert.throws(()=>selectAnimationTracks(file,reader,0),/UNSUPPORTED_ANIMATION_CHANNEL/);
 file.g.animations[0].channels[0].target.path='rotation';
 file.g.animations[0].samplers[0].interpolation='CUBICSPLINE';
 assert.throws(()=>selectAnimationTracks(file,reader,0),/UNSUPPORTED_ANIMATION_INTERPOLATION/);
});
test('renderer clip change commits valid evaluator and leaves prior scene on failure',()=>{
 const {file}=fixture();
 // A real decoded accessor-backed fixture for the actual renderer callback, no GPU required.
 const numbers=Float32Array.from([0,1,0,0,0,1,0,0,Math.SQRT1_2,Math.SQRT1_2,0,0,0,1,0,0,0,1]);
 file.bin=new DataView(numbers.buffer);
 file.g.bufferViews=[{byteOffset:0,byteLength:8},{byteOffset:8,byteLength:32},{byteOffset:40,byteLength:32}];
 file.g.accessors=[{bufferView:0,componentType:5126,type:'SCALAR',count:2},{bufferView:1,componentType:5126,type:'VEC4',count:2},{bufferView:2,componentType:5126,type:'VEC4',count:2}];
 const view=Object.create(FastModelView.prototype);view.file=file;view.frames=[1];
 view.setAnimationClip(0);const first=view.poseEvaluator;
 assert.equal(view.animationClipIndex,0);
 assert.throws(()=>view.setAnimationClip(3),/ANIMATION_CLIP_INDEX/);
 assert.strictEqual(view.poseEvaluator,first);
 view.setAnimationClip(1);assert.equal(view.animationClipIndex,1);
 assert.notStrictEqual(view.poseEvaluator,first);assert.deepEqual(view.frames,[]);
});
