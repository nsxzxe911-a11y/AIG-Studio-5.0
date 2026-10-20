import * as THREE from 'three';
// A bounded photo relief, not inferred hidden geometry or a neural depth estimate.
export function buildPhotoSurface(pixels,width,height,aspect){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2||width>128||height>128||pixels.length!==width*height*4||!Number.isFinite(aspect)||aspect<=0||aspect>100)throw Error('PHOTO_GRID_INVALID');
 const sx=aspect>=1?2:2*aspect,sy=aspect>=1?2/aspect:2;
 const positions=[],uv=[],indices=[];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4,luma=(pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722)/255;
  positions.push((x/(width-1)-.5)*sx,(.5-y/(height-1))*sy,(luma-.5)*.24);
  uv.push(x/(width-1),1-y/(height-1));
 }
 for(let y=0;y<height-1;y++)for(let x=0;x<width-1;x++){const i=y*width+x;indices.push(i,i+width,i+1,i+1,i+width,i+width+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function photoMotion(){const values=[];for(const a of [0,.16,0,-.16,0])values.push(0,Math.sin(a/2),0,Math.cos(a/2));return new THREE.AnimationClip('照片浮雕 · 左右擺動（非人物骨架）',4,[new THREE.QuaternionKeyframeTrack('PhotoSurface.quaternion',[0,1,2,3,4],values)]);}
