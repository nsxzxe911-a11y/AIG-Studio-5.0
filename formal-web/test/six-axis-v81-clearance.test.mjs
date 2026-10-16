import test from 'node:test';
import assert from 'node:assert/strict';
import {decorateSixAxisV8Geometry} from '../six-axis-skin-v8.js';

const base={solids:[
  {name:'bArmLeft',position:[-1.32,.82,0],size:[.36,1.26,1.50]},
  {name:'bArmRight',position:[1.32,.82,0],size:[.36,1.26,1.50]},
  {name:'bSupportRear',position:[0,.08,.86],size:[1.62,.50,.26]},
  {name:'bed',position:[0,0,0],size:[1,1,1]}
]};
const out=decorateSixAxisV8Geometry(base);
const n=Object.fromEntries(out.solids.map(s=>[s.name,s]));

test('A-side B arms are slim and no longer painted as large shell blocks',()=>{
  for(const k of ['bArmLeft','bArmRight']){
    assert.ok(n[k].size[0]<=.28,`${k} width=${n[k].size[0]}`);
    assert.ok(n[k].size[2]<=.82,`${k} depth=${n[k].size[2]}`);
    assert.ok(Math.abs(n[k].position[0])>=1.38,`${k} x=${n[k].position[0]}`);
    assert.equal(n[k].skin,undefined,`${k} external skin`);
  }
});

test('rear B support is smaller and moved away from A center',()=>{
  assert.ok(n.bSupportRear.size[0]<=1.35);
  assert.ok(n.bSupportRear.size[1]<=.40);
  assert.ok(n.bSupportRear.position[2]>=1.00);
});
