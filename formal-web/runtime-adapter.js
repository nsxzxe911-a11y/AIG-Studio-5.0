import { validateBinding } from './editor/command-registry.js';

function initialState(){return {ui:{shell:'formal-runtime',connection:'independent',lastStatus:'READY'},nc:{text:''},settings:{fps:60,precision:'0.001',jogMultiplier:1},sim:{playback:'stopped'},axis:{x:0,y:0,z:350,a:0,b:0,c:0},cad:{editorOpen:false},cam:{editorOpen:false}};}
const states=new Map();
function stateFor(productId){if(!['aig-ii','aig'].includes(productId))throw new Error(`UNKNOWN_PRODUCT:${productId}`);if(!states.has(productId))states.set(productId,initialState());return states.get(productId);}
export function getUiState(productId,statePath){const parts=statePath.split('.');let value=stateFor(productId);for(const key of parts){value=value?.[key];}return value;}
export function resetUiState(){states.set('aig-ii',initialState());states.set('aig',initialState());}
function result(productId,status,ok=true,extra={}){stateFor(productId).ui.lastStatus=status;return {ok,status,...extra};}
function jog(productId,axis,direction,payload){const state=stateFor(productId);const baseStep=Math.abs(Number(payload?.step??0.001));const multiplier=[1,10,100,1000].includes(Number(state.settings.jogMultiplier))?Number(state.settings.jogMultiplier):1;const step=baseStep*multiplier;state.axis[axis]=Math.round((state.axis[axis]+direction*step)*1000)/1000;return result(productId,'WEB_READY',true,{value:state.axis[axis]});}
export function dispatchUiCommand(productId,commandId,payload={}){
  let binding;
  try{binding=validateBinding({commandId},productId);}catch(error){return {ok:false,status:String(error.message||error)};}
  if(!binding.ok)return result(productId,binding.status,false);
  if(binding.status==='PENDING_NATIVE')return result(productId,'PENDING_NATIVE',false);
  const state=stateFor(productId);
  switch(commandId){
    case 'CONNECT': state.ui.connection='connected'; return result(productId,'WEB_READY');
    case 'DISCONNECT': state.ui.connection='independent'; return result(productId,'WEB_READY');
    case 'SIM_PLAY': state.sim.playback='playing'; return result(productId,'WEB_READY');
    case 'SIM_PAUSE': state.sim.playback='paused'; return result(productId,'WEB_READY');
    case 'SIM_STOP': state.sim.playback='stopped'; return result(productId,'WEB_READY');
    case 'NC_EDIT': state.nc.text=String(payload.text??''); return result(productId,'WEB_READY');
    case 'SETTINGS_SET': if(!payload.key)return result(productId,'BLOCKED_INVALID_PAYLOAD',false);state.settings[payload.key]=payload.value;return result(productId,'WEB_READY');
    case 'CAD_EDITOR_OPEN': state.cad.editorOpen=true; return result(productId,'WEB_READY');
    case 'CAM_EDITOR_OPEN': state.cam.editorOpen=true; return result(productId,'WEB_READY');
    case 'JOG_X_PLUS': return jog(productId,'x',1,payload); case 'JOG_X_MINUS': return jog(productId,'x',-1,payload);
    case 'JOG_Y_PLUS': return jog(productId,'y',1,payload); case 'JOG_Y_MINUS': return jog(productId,'y',-1,payload);
    case 'JOG_Z_PLUS': return jog(productId,'z',1,payload); case 'JOG_Z_MINUS': return jog(productId,'z',-1,payload);
    case 'JOG_A_PLUS': return jog(productId,'a',1,payload); case 'JOG_A_MINUS': return jog(productId,'a',-1,payload);
    case 'JOG_B_PLUS': return jog(productId,'b',1,payload); case 'JOG_B_MINUS': return jog(productId,'b',-1,payload);
    case 'JOG_C_PLUS': return jog(productId,'c',1,payload); case 'JOG_C_MINUS': return jog(productId,'c',-1,payload);
    default: return result(productId,'BLOCKED_UNKNOWN_COMMAND',false);
  }
}
resetUiState();
