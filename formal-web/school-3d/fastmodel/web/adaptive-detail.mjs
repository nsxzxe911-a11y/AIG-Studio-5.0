/** FastModel 1.5: reversible preview-detail scheduling.
 * Only explicit glTF material extras opt in; unknown meshes are structural.
 * A hidden detail batch keeps its VAO, GPU buffers, source GLB and Working Copy.
 */
export const DETAIL_MODES=Object.freeze(['auto','full','eco']);
export const OPTIONAL_GROUPS=Object.freeze(['fine-hair','foliage','water-foam']);
export function optionalDetailGroup(material,editable=false){
 if(editable||material?.extras?.aigOptionalRenderDetail!==true)return null;
 const group=material?.extras?.aigOptionalGroup;
 return OPTIONAL_GROUPS.includes(group)?group:null;
}
export function initialDetailState(){return {hidden:false,slow:0,cool:0};}
export function nextDetailState(state,{mode='auto',p95Ms=16.67,targetMs=16.67,pressure=false}={}){
 if(!DETAIL_MODES.includes(mode))throw new Error('Unknown detail mode');
 if(!Number.isFinite(p95Ms)||p95Ms<=0||!Number.isFinite(targetMs)||targetMs<=0)throw new RangeError('Invalid timing');
 if(mode==='full')return initialDetailState();
 if(mode==='eco')return {hidden:true,slow:0,cool:0};
 const slow=pressure||p95Ms>targetMs*1.32;
 const fast=!pressure&&p95Ms<targetMs*.96;
 const slowCount=slow?Math.min(30,(state?.slow||0)+1):0;
 const coolCount=fast?Math.min(180,(state?.cool||0)+1):0;
 const wasHidden=!!state?.hidden;
 return {
   hidden:wasHidden?!(coolCount>=180):(pressure||slowCount>=18),
   slow:slowCount,
   cool:coolCount
 };
}
export function visiblePreviewEntries(entries,hidden){
 return hidden?entries.filter(e=>e.optionalDetail!==true):entries.slice();
}
