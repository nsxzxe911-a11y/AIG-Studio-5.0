/** Genuine dedicated Web Worker: does compute, never fakes a CPU core. */
import {inspectAIGQuadStrainPacket} from './aig-real3d-quad-strain-task.mjs';
self.addEventListener('message',event=>{
 const {id,packed}=event.data??{};
 try{
  if(!Number.isInteger(id)||!(packed instanceof ArrayBuffer))
   throw Error('QUAD_WORKER_INPUT_INVALID');
  const result=inspectAIGQuadStrainPacket(new Float32Array(packed));
  self.postMessage({id,ok:true,result});
 }catch(e){self.postMessage({id,ok:false,error:String(e?.message??e)});}
});
