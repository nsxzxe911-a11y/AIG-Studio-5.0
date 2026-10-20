/* AIG School 3D structural GLB audit. Visual approval is separate. */
const decoder = new TextDecoder("utf-8", {fatal:true});
function ensure(v,m){if(!v)throw Error(m);}
export function parseGLB(input) {
 const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
 ensure(bytes.byteLength>=20 && bytes.byteLength<=100*1024*1024,"GLB 長度不合法");
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 ensure(v.getUint32(0,true)===0x46546c67,"GLB magic 不合法");
 ensure(v.getUint32(4,true)===2,"僅支援 glTF 2.0");
 ensure(v.getUint32(8,true)===bytes.byteLength,"GLB 標頭長度不一致");
 let off=12,json=null,bin=null,first=true;
 while(off<bytes.length) {
  ensure(off+8<=bytes.length,"GLB chunk header 不完整");
  const length=v.getUint32(off,true),type=v.getUint32(off+4,true);off+=8;
  ensure(length%4===0&&off+length<=bytes.length,"GLB chunk 大小或對齊錯誤");
  if(first)ensure(type===0x4e4f534a,"第一個 chunk 必須是 JSON");
  if(type===0x4e4f534a) {
   ensure(json===null,"重複 JSON chunk");
   json=JSON.parse(decoder.decode(bytes.subarray(off,off+length)).replace(/\u0000+$/g,"").trimEnd());
  }else if(type===0x004e4942){ensure(bin===null,"重複 BIN chunk");bin=bytes.subarray(off,off+length);}
  else throw Error("不支援的 GLB chunk");
  off+=length;first=false;
 }
 ensure(off===bytes.length&&json&&json.asset?.version?.startsWith("2."),"缺少 glTF 2.x JSON");
 ensure(Array.isArray(json.scenes)&&json.scenes.length&&Array.isArray(json.nodes)&&json.nodes.length,"GLB 缺少正式場景與節點");
 const buffers=json.buffers||[];
 ensure(buffers.length<=1,"只接受單一 GLB BIN");
 if(buffers.length)ensure(!buffers[0].uri&&bin&&bin.byteLength>=buffers[0].byteLength,"外部 buffer 或 BIN 缺漏");
 for(const [i,b] of (json.bufferViews||[]).entries())
  ensure(b.buffer===0&&Number.isInteger(b.byteLength)&&b.byteLength>=0&&
    (b.byteOffset||0)+b.byteLength<=(buffers[0]?.byteLength||0),`bufferView[${i}] 範圍錯誤`);
 for(const [i,img] of (json.images||[]).entries())
  ensure(img.bufferView!==undefined&&json.bufferViews?.[img.bufferView]&&
    /^image\/(png|jpeg|webp)$/.test(img.mimeType||""),`image[${i}] 必須是 GLB 內嵌貼圖`);
 ensure(!(json.extensionsRequired||[]).some(e=>/^(KHR_draco_mesh_compression|EXT_meshopt_compression|KHR_texture_basisu)$/.test(e)),
  "需要尚未安裝的壓縮解碼器");
 return json;
}
function triCount(g){
 let n=0;
 for(const mesh of g.meshes||[])for(const p of mesh.primitives||[]){
  if((p.mode??4)!==4)continue;
  const accessor=(g.accessors||[])[p.indices??p.attributes?.POSITION];
  if(accessor?.count)n+=Math.floor(accessor.count/3);
 }
 return n;
}
function norm(s){return String(s||"").toLowerCase().replace(/[^a-z0-9]/g,"");}
function matNamed(g,re){return (g.materials||[]).find(m=>re.test(m.name||""));}
function pbr(g,mat){
 const p=mat?.pbrMetallicRoughness,t=g.textures||[];
 return !!(p&&p.baseColorTexture&&t[p.baseColorTexture.index]&&
  p.metallicRoughnessTexture&&t[p.metallicRoughnessTexture.index]&&
  mat.normalTexture&&t[mat.normalTexture.index]);
}
export function auditGLB(input,role){
 const errors=[],warnings=[];let g;
 try{g=parseGLB(input);}catch(e){return {pass:false,role,errors:[e.message],warnings,metrics:{}};}
 const tri=triCount(g), names=(g.nodes||[]).map(n=>norm(n.name));
 const clips=(g.animations||[]).map(a=>norm(a.name));
 const metrics={triangles:tri,nodes:names.length,materials:(g.materials||[]).length,
  skins:(g.skins||[]).length,clips:clips.length,textures:(g.textures||[]).length,images:(g.images||[]).length};
 if((g.extensionsRequired||[]).length)warnings.push("另需檢查 required extensions 相容性");
 if(role==="character"){
  if(tri<15000)errors.push("角色網格低於 15000 三角面：禁止低模替代");
  const skin=(g.skins||[])[0];
  if(!skin||!Array.isArray(skin.joints)||skin.joints.length<24)errors.push("缺少至少 24 關節的人體骨架");
  const bound=(g.nodes||[]).some(n=>n.skin!==undefined&&g.skins?.[n.skin]&&g.meshes?.[n.mesh]);
  const weighted=(g.meshes||[]).some(m=>(m.primitives||[]).some(p=>
   p.attributes?.POSITION!==undefined&&p.attributes?.JOINTS_0!==undefined&&p.attributes?.WEIGHTS_0!==undefined));
  if(!bound||!weighted)errors.push("缺少網格 Skin 綁定或 JOINTS_0 / WEIGHTS_0 權重");
  for(const [label,rx] of [["hips",/hip|pelvis/],["spine",/spine/],["head",/head/],["neck",/neck/],
   ["left arm",/leftarm|upperarml|lupperarm/],["right arm",/rightarm|upperarmr|rupperarm/],
   ["left leg",/leftupleg|leftleg|upperlegl|lthigh/],["right leg",/rightupleg|rightleg|upperlegr|rthigh/]])
   if(!names.some(n=>rx.test(n)))errors.push(`骨架缺少 ${label} 節點`);
  const skinMat=matNamed(g,/skin|face/i),hairMat=matNamed(g,/hair/i),fabricMat=matNamed(g,/fabric|cloth|uniform|blazer|shirt|skirt/i);
  if(!skinMat||!pbr(g,skinMat))errors.push("Skin PBR 缺少 BaseColor / Roughness / Normal 內嵌貼圖");
  if(skinMat?.pbrMetallicRoughness?.metallicFactor>.3)errors.push("皮膚金屬度不合理");
  if(!hairMat||!pbr(g,hairMat))errors.push("缺少獨立髮絲 PBR 材質");
  if(!fabricMat||!pbr(g,fabricMat))errors.push("缺少制服布料 PBR 材質");
  const morphNames=(g.meshes||[]).flatMap(m=>m.extras?.targetNames||[]).map(norm);
  const targets=(g.meshes||[]).some(m=>(m.primitives||[]).some(p=>(p.targets||[]).length>=2));
  if(!targets||!morphNames.some(n=>/blink|eyelid/.test(n))||
    !morphNames.some(n=>/smile|mouth/.test(n)))errors.push("表情 Morph Targets 缺少 Blink / Smile");
 }else if(role==="campus"){
  if(tri<25000)errors.push("校園幾何不足，禁止低階盒子場景");
  const nn=(g.nodes||[]).map(n=>String(n.name||"").toLowerCase());
  for(const [label,re] of [["school",/school|campus|schoolhouse/],["gate",/gate|entrance/],
    ["sakura",/sakura|cherry|blossom/]])if(!nn.some(n=>re.test(n)))errors.push(`場景缺少 ${label}`);
  if(!(g.materials||[]).some(m=>pbr(g,m)))errors.push("校園缺少內嵌 PBR 貼圖");
 }else if(role==="animations"){
  if(!clips.some(n=>/idle|breath|stand/.test(n)))errors.push("缺少 Idle 動畫");
  if(!clips.some(n=>/walk|stride/.test(n)))errors.push("缺少 Walk 動畫");
  const ch=(g.animations||[]).flatMap(a=>a.channels||[]);
  if(ch.length<6)errors.push("動作 Channel 數量不足");
  if(!(g.nodes||[]).some(n=>n.name))errors.push("動畫缺少對應 Rig 名稱");
  if(tri)warnings.push("動畫檔包含多餘網格");
 }else errors.push("未知資產類型");
 warnings.push("結構 PASS 不是視覺 PASS；還需要角色 Authority、動作與 S23/4K 實圖驗收");
 return {pass:errors.length===0,role,errors,warnings,metrics};
}
