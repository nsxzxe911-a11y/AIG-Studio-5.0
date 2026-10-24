/**
 * AIG Real3D V91 — real 3D ball motion shared by five sports.
 *
 * Meter / second / kg / radian SI contract. Deterministic substepped motion:
 * gravity + quadratic aerodynamic drag + bounded Magnus approximation,
 * continuous radius/plane crossing detection, rigid impulse restitution,
 * Coulomb contact friction, rotational inertia, manual SOURCE-BOUND actor
 * strike/release events, and sampled 3D/quaternion trajectories.
 *
 * These are engineering approximations, not certified sport-specific aerodynamics.
 * Seams, panels, cloth, detailed racket string beds, net deformation, hoop
 * geometry and complex continuous mesh collisions are NOT represented by planes.
 */
export const AIG_REAL3D_V91_PHYSICS_SCHEMA='AIG_REAL3D_V91_SPORTS_3D_PHYSICS_V1';
export const AIG_REAL3D_V91_SPORTS=Object.freeze(['BASEBALL','TENNIS','BASKETBALL','SOCCER','TABLE_TENNIS']);
export const AIG_REAL3D_V91_PRESETS=Object.freeze({
 BASEBALL:Object.freeze({radiusM:.0366,massKg:.145,dragCoefficient:.36,spinLiftScale:1.1,
  restitution:.47,friction:.38,spinDecayPerSec:.15}),
 TENNIS:Object.freeze({radiusM:.0335,massKg:.0577,dragCoefficient:.60,spinLiftScale:1.2,
  restitution:.70,friction:.50,spinDecayPerSec:.18}),
 BASKETBALL:Object.freeze({radiusM:.119,massKg:.624,dragCoefficient:.52,spinLiftScale:.55,
  restitution:.72,friction:.54,spinDecayPerSec:.11}),
 SOCCER:Object.freeze({radiusM:.11,massKg:.43,dragCoefficient:.26,spinLiftScale:1.1,
  restitution:.55,friction:.41,spinDecayPerSec:.16}),
 TABLE_TENNIS:Object.freeze({radiusM:.02,massKg:.0027,dragCoefficient:.48,spinLiftScale:1.5,
  restitution:.82,friction:.57,spinDecayPerSec:.22})
});
const reject=x=>{throw Error('REAL3D_V91_PHYSICS_'+x);};
const finite=Number.isFinite;
const v3=v=>Array.isArray(v)&&v.length===3&&v.every(finite);
const add=(a,b)=>a.map((x,i)=>x+b[i]);
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const mul=(a,s)=>a.map(x=>x*s);
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const length=v=>Math.hypot(...v);
const unit=v=>mul(v,1/(length(v)||1));
const clamp=(x,l,h)=>Math.min(h,Math.max(l,x));
const finiteBounds=b=>b===null||(b&&v3(b.min)&&v3(b.max)&&b.min.every((x,i)=>x<=b.max[i]));
const clone=s=>({timeSec:s.timeSec,position:[...s.position],
 velocity:[...s.velocity],angularVelocity:[...s.angularVelocity],
 orientationQuaternion:[...s.orientationQuaternion]});
function rotateQuaternion(q,w,h){
 const [x,y,z,a]=q,[wx,wy,wz]=w;
 const dq=[a*wx+y*wz-z*wy,a*wy+z*wx-x*wz,
  a*wz+x*wy-y*wx,-x*wx-y*wy-z*wz];
 const result=q.map((t,i)=>t+.5*h*dq[i]),norm=length(result);
 if(norm<1e-10)reject('ORIENTATION_NOT_NORMALIZABLE');
 return result.map(x=>x/norm);
}
function validateSurface(p,i,preset){
 const label=String(p?.id??'');
 if(!/^[A-Za-z][A-Za-z0-9_-]{0,47}$/.test(label)||
  !v3(p?.point)||!v3(p?.normal)||
  Math.abs(length(p.normal)-1)>.001||
  !finiteBounds(p?.bounds??null)||
  (p.restitution!==undefined&&(!finite(p.restitution)||p.restitution<0||p.restitution>1))||
  (p.friction!==undefined&&(!finite(p.friction)||p.friction<0||p.friction>2)))
  reject('SURFACE_'+i+'_INVALID');
 return {id:label,point:[...p.point],normal:[...unit(p.normal)],
  bounds:p.bounds??null,restitution:p.restitution??preset.restitution,
  friction:p.friction??preset.friction};
}
function validateEvent(e,index,duration){
 if(!e||!['RELEASE','IMPACT'].includes(e.type)||
  !finite(e.timeSec)||e.timeSec<0||e.timeSec>duration||
  typeof e.actorId!=='string'||!/^[a-zA-Z][a-zA-Z0-9_-]{0,47}$/.test(e.actorId)||
  !['HAND','BAT','RACKET','FOOT','PADDLE'].includes(e.apparatus))
  reject('ACTOR_EVENT_'+index+'_INVALID');
 if(e.type==='RELEASE'){
  if(!v3(e.velocity)||!v3(e.angularVelocity??[0,0,0])||
   (e.position!==undefined&&!v3(e.position)))
   reject('RELEASE_VECTOR_INVALID');
 }else{
  if(!v3(e.contactNormal)||Math.abs(length(e.contactNormal)-1)>.001||
   !v3(e.contactPoint)||!v3(e.surfaceVelocity)||
   (e.restitution!==undefined&&(!finite(e.restitution)||e.restitution<0||e.restitution>1))||
   (e.friction!==undefined&&(!finite(e.friction)||e.friction<0||e.friction>2)))
   reject('IMPACT_CONTACT_INVALID');
 }
 return {...e};
}
function accelerated(state,preset,airDensity,gravity){
 const speed=length(state.velocity);
 const area=Math.PI*preset.radiusM**2;
 const drag=mul(state.velocity,
  -.5*airDensity*preset.dragCoefficient*area*speed/preset.massKg);
 const spinCross=cross(state.angularVelocity,state.velocity),spinDir=length(spinCross);
 const spinRatio=preset.radiusM*length(state.angularVelocity)/Math.max(.05,speed);
 const cl=clamp(preset.spinLiftScale*spinRatio,0,.38);
 const magnus=spinDir<1e-9?[0,0,0]:mul(spinCross,
  (.5*airDensity*area*cl*speed*speed/preset.massKg)/spinDir);
 return add([0,-gravity,0],add(drag,magnus));
}
function applyImpulse(state,normal,surfaceVelocity,restitution,friction,preset){
 const n=unit(normal),r=mul(n,-preset.radiusM),
  relative=sub(add(state.velocity,cross(state.angularVelocity,r)),surfaceVelocity),
  closing=dot(relative,n);
 if(closing>=-1e-7)return false;
 const mass=preset.massKg,jn=-(1+restitution)*closing*mass;
 state.velocity=add(state.velocity,mul(n,jn/mass));
 const slip=sub(relative,mul(n,closing)),slipMag=length(slip);
 if(slipMag>1e-9){
  const inertia=.4*mass*preset.radiusM**2;
  const effective=1/mass+preset.radiusM**2/inertia;
  const jt=Math.min(slipMag/effective,friction*jn);
  const tangentImpulse=mul(slip,-jt/slipMag);
  state.velocity=add(state.velocity,mul(tangentImpulse,1/mass));
  state.angularVelocity=add(state.angularVelocity,
   mul(cross(r,tangentImpulse),1/inertia));
 }
 return true;
}
function contactFits(surface,contactPoint){
 return !surface.bounds||contactPoint.every((x,i)=>
  x>=surface.bounds.min[i]-1e-7&&x<=surface.bounds.max[i]+1e-7);
}
function advanceSubstep(state,dt,preset,surfaces,gravity,airDensity,collisions){
 const prev=[...state.position],acc=accelerated(state,preset,airDensity,gravity);
 const nextV=add(state.velocity,mul(acc,dt)),nextP=add(prev,mul(nextV,dt));
 state.velocity=nextV;
 state.angularVelocity=mul(state.angularVelocity,Math.exp(-preset.spinDecayPerSec*dt));
 const oldQ=state.orientationQuaternion;
 state.orientationQuaternion=rotateQuaternion(oldQ,state.angularVelocity,dt);
 let earliest=null;
 for(const s of surfaces){
  const start=dot(sub(prev,s.point),s.normal)-preset.radiusM,
   end=dot(sub(nextP,s.point),s.normal)-preset.radiusM;
  if(start < -1e-4)reject('SOURCE_BALL_BELOW_COLLIDER_PLANE');
  if(start>=-1e-7&&end<=1e-7&&dot(state.velocity,s.normal)<-1e-7){
   const denom=start-end;
   const ratio=denom>1e-10?clamp(start/denom,0,1):0;
   const point=add(prev,mul(sub(nextP,prev),ratio));
   const surfacePoint=sub(point,mul(s.normal,preset.radiusM));
   if(!contactFits(s,surfacePoint))continue;
   if(!earliest||ratio<earliest.ratio)earliest={s,ratio,point};
  }
 }
 if(earliest){
  const {s,ratio,point}=earliest;
  state.position=add(point,mul(s.normal,1e-6));
  const before=[...state.velocity];
  const impact=applyImpulse(state,s.normal,[0,0,0],
   s.restitution,s.friction,preset);
  if(impact)collisions.push({type:'SURFACE_IMPACT',surfaceId:s.id,
   timeSec:state.timeSec+dt*ratio,position:[...state.position],
   velocityBefore:before,velocityAfter:[...state.velocity]});
  const remaining=dt*(1-ratio);
  state.position=add(state.position,mul(state.velocity,remaining));
  // This bounded integrator resolves the earliest finite plane in each
  // microstep. Multiple simultaneous contacts are not claimed as verified.
 }else state.position=nextP;
 state.timeSec+=dt;
 if(![...state.position,...state.velocity,...state.angularVelocity].every(finite))
  reject('NUMERIC_INTEGRATION_DIVERGED');
}
function applyActorEvent(state,e,preset,contacts){
 if(e.type==='RELEASE'){
  if(e.position)state.position=[...e.position];
  state.velocity=[...e.velocity];
  state.angularVelocity=[...(e.angularVelocity??[0,0,0])];
  contacts.push({type:'ACTOR_RELEASE',actorId:e.actorId,
   apparatus:e.apparatus,timeSec:state.timeSec});
  return;
 }
 const radial=sub(state.position,e.contactPoint);
 if(Math.abs(length(radial)-preset.radiusM)>Math.max(.005,preset.radiusM*.1))
  reject('ACTOR_IMPACT_POSITION_NOT_ON_BALL');
 if(dot(unit(radial),unit(e.contactNormal))<.95)
  reject('ACTOR_IMPACT_NORMAL_ORIENTATION_INVALID');
 const before=[...state.velocity];
 const success=applyImpulse(state,e.contactNormal,e.surfaceVelocity,
  e.restitution??preset.restitution,e.friction??preset.friction,preset);
 if(!success)reject('ACTOR_IMPACT_NOT_APPROACHING');
 contacts.push({type:'ACTOR_IMPACT',actorId:e.actorId,apparatus:e.apparatus,
  timeSec:state.timeSec,velocityBefore:before,velocityAfter:[...state.velocity]});
}
export function simulateAIGReal3DSportBall({
 sport,initialPosition=[0,1,0],initialVelocity=[0,0,0],
 initialAngularVelocity=[0,0,0],durationSec=2,fps=60,
 maxStepSec=1/480,gravity=9.80665,airDensity=1.225,
 surfaces=null,actorEvents=[]
}={}){
 if(!AIG_REAL3D_V91_SPORTS.includes(sport)||
  !v3(initialPosition)||!v3(initialVelocity)||!v3(initialAngularVelocity)||
  !finite(durationSec)||durationSec<=0||durationSec>20||
  ![24,30,60,120].includes(fps)||
  !finite(maxStepSec)||maxStepSec<=0||maxStepSec>1/120||
  !finite(gravity)||gravity<0||gravity>30||
  !finite(airDensity)||airDensity<0||airDensity>3||
  length(initialVelocity)>150||length(initialAngularVelocity)>2500||
  !Array.isArray(actorEvents)||actorEvents.length>96)
  reject('SIMULATION_SETTINGS_INVALID');
 const preset=AIG_REAL3D_V91_PRESETS[sport];
 const planes=(surfaces??[{id:'ground',point:[0,0,0],
  normal:[0,1,0]}]);
 if(!Array.isArray(planes)||planes.length>24)
  reject('SURFACE_COUNT_INVALID');
 const prepared=planes.map((s,i)=>validateSurface(s,i,preset));
 if(new Set(prepared.map(x=>x.id)).size!==prepared.length)
  reject('DUPLICATE_SURFACE_ID');
 const events=actorEvents.map((e,i)=>validateEvent(e,i,durationSec));
 events.sort((a,b)=>a.timeSec-b.timeSec);
 if(events.some((x,i)=>i&&x.timeSec-events[i-1].timeSec<1e-9))
  reject('SIMULTANEOUS_ACTOR_EVENTS_NOT_SUPPORTED');
 const state={timeSec:0,position:[...initialPosition],
  velocity:[...initialVelocity],angularVelocity:[...initialAngularVelocity],
  orientationQuaternion:[0,0,0,1]};
 const collisions=[],contacts=[],samples=[];
 for(const p of prepared)
  if(dot(sub(state.position,p.point),p.normal)-preset.radiusM<-1e-4)
   reject('INITIAL_BALL_PENETRATES_SURFACE');
 let nextEvent=0,substeps=0;
 function consumeEvents(){
  while(nextEvent<events.length&&
   events[nextEvent].timeSec<=state.timeSec+1e-10){
   applyActorEvent(state,events[nextEvent++],preset,contacts);
  }
 }
 consumeEvents();
 const frames=Math.ceil(durationSec*fps);
 for(let i=0;i<=frames;i++){
  const target=Math.min(durationSec,i/fps);
  while(state.timeSec<target-1e-10){
   consumeEvents();
   const untilEvent=nextEvent<events.length?
    Math.max(0,events[nextEvent].timeSec-state.timeSec):Infinity;
   const dt=Math.min(maxStepSec,target-state.timeSec,untilEvent);
   if(dt<1e-10){consumeEvents();continue;}
   advanceSubstep(state,dt,preset,prepared,gravity,airDensity,collisions);
   substeps++;if(substeps>30000)reject('SUBSTEP_BUDGET_EXCEEDED');
  }
  consumeEvents();
  samples.push(clone(state));
 }
 const movement=samples.some((f,i)=>i&&length(sub(f.position,samples[0].position))>1e-6);
 const trajectory={
  schema:AIG_REAL3D_V91_PHYSICS_SCHEMA,sport,
  units:'METERS_SECONDS_KG_RADIANS',
  preset:{...preset},gravity,airDensity,fps,durationSec,
  frames:samples,collisions,actorContacts:contacts,
  diagnostics:{
   actualIntegratedSubsteps:substeps,
   actuallyMoving3DPositions:movement,
   threeDimensionalPhysicsComputed:true,
   airDragAndMagnusApproximation:true,
   impactsResolveContinuousPlaneCrossings:true,
   actorContactRequiresProvidedVerifiedGeometry:false,
   fullMeshCCDVerified:false,
   calibratedFlightDataMatchVerified:false,
   actorMotionAutomaticallyInferredFromVideo:false,
   fullMovieWebMEncoded:false,
   realPersonMotionSourceCertified:false,
   releasePASS:false
  }
 };
 return trajectory;
}
