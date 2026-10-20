/** AIG FastModel soft surface inspection. Zero extra mesh geometry or wire draw calls.
 * In edit mode, shade the first 256 vertices ONLY on the real editable GPU batch.
 * This matches patchLocal; it is NOT a precise freeform brush or image silhouette.
 */
export const SURFACE_GUIDES=Object.freeze(['clean','edit-tint','soft-contrast']);
export function surfaceGuideId(mode){
 const i=SURFACE_GUIDES.indexOf(mode);
 if(i===-1)throw Error('Unknown surface inspection mode');
 return i;
}
export function isPatchVertex(index,editable,mode){
 return mode==='edit-tint'&&editable&&Number.isInteger(index)&&index>=0&&index<256;
}
export function guideNeedsWireGeometry(mode){surfaceGuideId(mode);return false;}