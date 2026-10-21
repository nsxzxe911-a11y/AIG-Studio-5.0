/** FastModel 6.9.3 — fail-safe mobile AUTO input normalization.
 * Empty/invalid duration is browser-input state, not a failed animation.
 * Explicit 3D remains explicit: never misrepresent flat 2D as real 3D.
 */
export const AIG693_INPUT_SCHEMA='AIG_FASTMODEL_6_9_3_MOBILE_AUTO_INPUTS';
export const AIG693_VALID_MODES=Object.freeze(['AUTO','2D','2.5D','3D']);
export function normalizeAIG693AutoInputs({mode='',duration='',story='',hasImage=false}={}){
 const corrections=[];
 const rawMode=typeof mode==='string'?mode.trim():'';
 let requestedMode=rawMode;
 if(!AIG693_VALID_MODES.includes(requestedMode)){
  requestedMode='AUTO';corrections.push('MODE_DEFAULT_AUTO');
 }
 let seconds=typeof duration==='number'?duration:Number(
  typeof duration==='string'?duration.trim():NaN);
 if(duration==null||duration===''||
  (typeof duration==='string'&&duration.trim()==='')||
  !Number.isFinite(seconds)||seconds<2||seconds>60){
  seconds=8;corrections.push('DURATION_DEFAULT_8_SECONDS');
 }
 const text=typeof story==='string'?story:'';
 const ready=Boolean(hasImage||text.trim());
 return {schema:AIG693_INPUT_SCHEMA,requestedMode,durationSeconds:seconds,
  storyText:text,ready,corrections,
  blockingReason:ready?null:'請選一張照片，或輸入簡短劇情。',
  durationMinimumSeconds:2,durationMaximumSeconds:60,
  audioFileRequired:false,requiresNewUserGestureForAudio:true,
  actualRenderOccurred:false};
}
