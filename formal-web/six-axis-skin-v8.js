const PRIMARY=Object.freeze({
  id:'polyhaven-blue-metal-plate',
  title:'Blue Metal Plate',
  sourceUrl:'https://polyhaven.com/a/blue_metal_plate',
  previewUrl:'https://cdn.polyhaven.com/asset_img/primary/blue_metal_plate.png?height=760&quality=95',
  license:'CC0',
  author:'Rob Tuytel',
  externalOptional:true
});
const PAINTED=new Set(['bed','rearColumnLeft','rearColumnRight','bridge','headRail','spindleHead','bSupportFront','bSupportRear','bArmLeft','bArmRight']);
const STEEL=new Set(['spindleNose','toolHolder','tool','bBearingFront','bBearingRear','bJournalFront','bJournalRear','aBearingLeft','aBearingRight','aHubLeft','aHubRight','aBody','chuck']);
export function getSixAxisV8SkinManifest(){return {primary:PRIMARY,offlineFallback:'V7_COLORS'};}
export function decorateSixAxisV8Geometry(base){return {...base,solids:(base.solids||[]).map(s=>{
  const out={...s,position:s.position?[...s.position]:s.position,size:s.size?[...s.size]:s.size};
  if(PAINTED.has(s.name)) out.skin=PRIMARY.id;
  if(STEEL.has(s.name)) out.material='brushed-steel';
  return out;
})};}
