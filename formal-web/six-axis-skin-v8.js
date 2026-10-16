const PRIMARY=Object.freeze({
  id:'polyhaven-blue-metal-plate',
  title:'Blue Metal Plate',
  sourceUrl:'https://polyhaven.com/a/blue_metal_plate',
  previewUrl:'https://cdn.polyhaven.com/asset_img/primary/blue_metal_plate.png?height=760&quality=95',
  license:'CC0',
  author:'Rob Tuytel',
  externalOptional:true
});
const REMOVED=new Set(['headRail','bSupportFront']);
const PAINTED=new Set(['bed','rearColumnLeft','rearColumnRight','bridge','spindleHead']);
const STEEL=new Set(['spindleNose','toolHolder','tool','bSupportRear','bArmLeft','bArmRight','bBearingFront','bBearingRear','bJournalFront','bJournalRear','aBearingLeft','aBearingRight','aHubLeft','aHubRight','aBody','chuck']);
export function getSixAxisV8SkinManifest(){return {primary:PRIMARY,offlineFallback:'V7_COLORS'};}
export function decorateSixAxisV8Geometry(base){
  const solids=(base.solids||[]).filter(s=>!REMOVED.has(s.name)).map(s=>{
    const out={...s,position:s.position?[...s.position]:s.position,size:s.size?[...s.size]:s.size};
    if(s.name==='bArmLeft'){out.position=[-1.56,.84,0];out.size=[.22,1.08,.72];}
    if(s.name==='bArmRight'){out.position=[1.56,.84,0];out.size=[.22,1.08,.72];}
    if(s.name==='bSupportRear'){out.position=[0,.10,1.26];out.size=[1.02,.30,.12];}
    if(s.name==='bBearingFront'||s.name==='bBearingRear') out.size=[.90,.90,.34];
    if(s.name==='bJournalFront'||s.name==='bJournalRear') out.size=[.36,.36,.46];
    if(s.name==='aBearingLeft'){out.position=[-1.34,1.16,0];out.size=[.50,1.26,1.26];}
    if(s.name==='aBearingRight'){out.position=[1.34,1.16,0];out.size=[.50,1.26,1.26];}
    if(s.name==='aHubLeft'){out.position=[-1.16,1.16,0];out.size=[.36,.50,.50];}
    if(s.name==='aHubRight'){out.position=[1.16,1.16,0];out.size=[.36,.50,.50];}
    if(s.name==='aBody') out.size=[1.98,.66,.66];
    if(s.name==='chuck') out.size=[1.32,.82,.82];
    if(PAINTED.has(s.name)) out.skin=PRIMARY.id;
    if(STEEL.has(s.name)) out.material='brushed-steel';
    return out;
  });
  solids.push(
    {name:'aSupportSeatLeft',role:'b',primitive:'ringX',position:[-1.56,1.16,0],size:[.34,1.56,1.56],color:[.18,.31,.33,1],material:'brushed-steel'},
    {name:'aSupportSeatRight',role:'b',primitive:'ringX',position:[1.56,1.16,0],size:[.34,1.56,1.56],color:[.18,.31,.33,1],material:'brushed-steel'},
    {name:'bSupportSeatFront',role:'c',primitive:'ringZ',position:[0,.42,-1.02],size:[1.24,1.24,.22],color:[.18,.31,.33,1],material:'brushed-steel'},
    {name:'bSupportSeatRear',role:'c',primitive:'ringZ',position:[0,.42,1.02],size:[1.24,1.24,.22],color:[.18,.31,.33,1],material:'brushed-steel'}
  );
  return {...base,solids};
}
