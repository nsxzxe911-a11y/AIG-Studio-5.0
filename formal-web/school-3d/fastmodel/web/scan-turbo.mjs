/** FastModel 2.4 ultra-fast, fail-safe scan display scheduling.
 * No artificial/simulated vertices. Low latency comes from REAL GLB joints first,
 * deferred optional mesh edges, and bounded/optional CPU depth sampling.
 * These phases are NOT GPU FPS or thermal measurements.
 */
export const SCAN_SPEED_MODES=Object.freeze(['turbo','balanced','precise']);
export function scanSpeedPolicy(speed='turbo',small=false){
 if(!SCAN_SPEED_MODES.includes(speed))throw Error('SCAN_SPEED_INVALID');
 const policies={
  turbo:{bonesFrames:3,outlineFrames:9,intervalMs:small?120:65,depthAllowed:!small,
   density:small?'eco':'balanced',slowSubmitMs:20,slowOverlayMs:10,recoverFrames:12},
  balanced:{bonesFrames:1,outlineFrames:3,intervalMs:small?95:50,depthAllowed:true,
   density:small?'eco':'balanced',slowSubmitMs:25,slowOverlayMs:14,recoverFrames:9},
  precise:{bonesFrames:0,outlineFrames:0,intervalMs:small?95:50,depthAllowed:true,
   density:small?'eco':'detail',slowSubmitMs:28,slowOverlayMs:18,recoverFrames:5}
 };
 return Object.freeze({...policies[speed]});
}
export function createTurboScanController({speed='turbo',small=false}={}){
 let policy=scanSpeedPolicy(speed,small),frames=0,hot=0,cool=0,throttled=false,lastOverlayMs=0;
 return {
  reset(nextSpeed=speed,isSmall=small){speed=nextSpeed;small=isSmall;policy=scanSpeedPolicy(speed,small);frames=0;hot=0;cool=0;throttled=false;lastOverlayMs=0;},
  sample({mainSubmitMs=0,overlayMs=lastOverlayMs,requestedMode='bones-outline',
          requestedDensity='balanced',requestedDepth='sampled',topologyReady=false}={}){
   if(!['off','bones','bones-outline','head-neck','hair'].includes(requestedMode))throw Error('SCAN_SPEED_MODE_INVALID');
   if(!['eco','balanced','detail'].includes(requestedDensity)||!['off','sampled'].includes(requestedDepth))throw Error('SCAN_SPEED_OPTIONS_INVALID');
   if(![mainSubmitMs,overlayMs].every(x=>Number.isFinite(x)&&x>=0))throw Error('SCAN_SPEED_TELEMETRY_INVALID');
   frames++;
   const slow=mainSubmitMs>policy.slowSubmitMs||overlayMs>policy.slowOverlayMs;
   if(slow){hot++;cool=0;}else{hot=Math.max(0,hot-1);cool++;}
   if(hot>=2){throttled=true;cool=0;}
   if(throttled&&cool>=policy.recoverFrames){throttled=false;hot=0;cool=0;frames=policy.bonesFrames+1;}
   const hasOutline=topologyReady&&frames>policy.bonesFrames&&!throttled;
   const allowDepth=hasOutline&&frames>policy.outlineFrames&&policy.depthAllowed&&
     requestedDepth==='sampled'&&requestedMode!=='bones';
   const renderMode=requestedMode==='off'?'off':!hasOutline?'bones':requestedMode;
   const depthMode=allowDepth?'sampled':'off';
   const density=small?'eco':speed==='turbo'?policy.density:requestedDensity;
   return {renderMode,depthMode,density,phase:requestedMode==='off'?'off':!hasOutline?'bones':depthMode==='sampled'?'depth':'outline',
    speed,intervalMs:throttled?Math.max(150,policy.intervalMs):policy.intervalMs,
    throttled,sourceVerticesUnchanged:true,actualHardwareFpsMeasured:false,
    mainSubmitMs,overlayMs,frameSamples:frames};
  },
  recordOverlayMs(ms){if(Number.isFinite(ms)&&ms>=0)lastOverlayMs=ms;},
  get latestOverlayMs(){return lastOverlayMs;}
 };
}
