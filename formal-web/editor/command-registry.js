const BASE_COMMANDS = Object.freeze([
  {id:'CONNECT',label:'連接',status:'WEB_READY',safety:'NORMAL'},
  {id:'DISCONNECT',label:'斷開',status:'WEB_READY',safety:'NORMAL'},
  {id:'SIM_PLAY',label:'模擬播放',status:'WEB_READY',safety:'NORMAL'},
  {id:'SIM_PAUSE',label:'模擬暫停',status:'WEB_READY',safety:'NORMAL'},
  {id:'SIM_STOP',label:'模擬停止',status:'WEB_READY',safety:'NORMAL'},
  {id:'NC_EDIT',label:'編輯 NC',status:'WEB_READY',safety:'NORMAL'},
  {id:'SETTINGS_SET',label:'修改設定',status:'WEB_READY',safety:'NORMAL'},
  {id:'CAD_EDITOR_OPEN',label:'開啟 CAD 編輯',status:'WEB_READY',safety:'NORMAL'},
  {id:'CAM_EDITOR_OPEN',label:'開啟 CAM 編輯',status:'WEB_READY',safety:'NORMAL'},
  {id:'JOG_X_PLUS',label:'X+',status:'WEB_READY',safety:'JOG'},
  {id:'JOG_X_MINUS',label:'X-',status:'WEB_READY',safety:'JOG'},
  {id:'JOG_Y_PLUS',label:'Y+',status:'WEB_READY',safety:'JOG'},
  {id:'JOG_Y_MINUS',label:'Y-',status:'WEB_READY',safety:'JOG'},
  {id:'JOG_Z_PLUS',label:'Z+',status:'WEB_READY',safety:'JOG'},
  {id:'JOG_Z_MINUS',label:'Z-',status:'WEB_READY',safety:'JOG'},
  {id:'JOG_A_PLUS',label:'A+',status:'WEB_READY',safety:'JOG'},
  {id:'JOG_A_MINUS',label:'A-',status:'WEB_READY',safety:'JOG'},
  {id:'JOG_B_PLUS',label:'B+',status:'WEB_READY',safety:'JOG'},
  {id:'JOG_B_MINUS',label:'B-',status:'WEB_READY',safety:'JOG'},
  {id:'JOG_C_PLUS',label:'C+',status:'WEB_READY',safety:'JOG'},
  {id:'JOG_C_MINUS',label:'C-',status:'WEB_READY',safety:'JOG'},
  {id:'CAD_COMMIT',label:'套用 CAD 修改',status:'PENDING_NATIVE',safety:'NORMAL'},
  {id:'CAM_REBUILD',label:'重建 CAM 刀路',status:'PENDING_NATIVE',safety:'NORMAL'},
  {id:'NC_VALIDATE',label:'驗證 NC',status:'PENDING_NATIVE',safety:'CNC_SAFETY'},
  {id:'MACHINE_SEND',label:'送至機台',status:'PENDING_NATIVE',safety:'CNC_SAFETY'}
]);
const STATE_PREFIXES = Object.freeze(['ui.','runtime.','axis.','nc.','cad.','cam.','sim.','settings.']);
export function listCommands(productId){if(!['aig-ii','aig'].includes(productId))throw new Error(`UNKNOWN_PRODUCT:${productId}`);return BASE_COMMANDS.map(c=>({...c}));}
function findCommand(productId,commandId){return listCommands(productId).find(c=>c.id===commandId);}
export function validateBinding(binding,productId){if(binding?.commandId){const command=findCommand(productId,binding.commandId);return command?{ok:true,status:command.status,command}:{ok:false,status:'BLOCKED_UNKNOWN_COMMAND'};}if(binding?.statePath){const ok=STATE_PREFIXES.some(prefix=>binding.statePath.startsWith(prefix));return ok?{ok:true,status:'READY'}:{ok:false,status:'BLOCKED_UNKNOWN_STATE'};}return {ok:false,status:'BLOCKED_EMPTY_BINDING'};}
export function bindCommand(element,commandId,productId){const result=validateBinding({commandId},productId);if(!result.ok)throw new Error(result.status);element.commandId=commandId;element.commandStatus=result.status;element.safety=result.command.safety;return result;}
export function bindState(widget,statePath,productId){const result=validateBinding({statePath},productId);if(!result.ok)throw new Error(result.status);widget.statePath=statePath;return result;}
