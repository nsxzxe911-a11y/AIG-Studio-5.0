/* AIG 6AX mechanism V1: pure kinematic transforms for UI-only WebGL preview.
   Machine XYZ in illustrative mm, A/B/H in degrees. Not a calibrated CNC machine.
   The left/right A supports share ONE rotation; B rotates the inner platter;
   H is an independent spindle-head hinge below linear Z (not Z rotation).
   No CNC output, IK, material-removal or certified collision detection. */
(function(g){"use strict";
const DEG=Math.PI/180;
const I=()=>[1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
function mul(a,b){const r=new Array(16).fill(0);for(let c=0;c<4;c++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)r[c*4+row]+=a[k*4+row]*b[c*4+k];return r;}
function tr(x=0,y=0,z=0){const m=I();m[12]=x;m[13]=y;m[14]=z;return m;}
function rx(d){const a=d*DEG,c=Math.cos(a),s=Math.sin(a);return [1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1];}
function ry(d){const a=d*DEG,c=Math.cos(a),s=Math.sin(a);return [c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1];}
function rz(d){const a=d*DEG,c=Math.cos(a),s=Math.sin(a);return [c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1];}
function chain(...m){return m.reduce(mul,I());}
function point(m,p=[0,0,0]){const [x,y,z]=p;return [m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]];}
const limits=Object.freeze({X:[-200,200],Y:[-200,200],Z:[-150,150],A:[-360,360],B:[-360,360],H:[0,45]});
const joints=Object.freeze([
 Object.freeze({id:"X",type:"prismatic",unit:"mm",parent:"FRAME"}),
 Object.freeze({id:"Y",type:"prismatic",unit:"mm",parent:"X"}),
 Object.freeze({id:"Z",type:"prismatic",unit:"mm",parent:"Y"}),
 Object.freeze({id:"H",type:"revolute",unit:"deg",parent:"Z",axis:"local +Y"}),
 Object.freeze({id:"A",type:"revolute",unit:"deg",parent:"FRAME",axis:"local +X",dualSupportOneAxis:true}),
 Object.freeze({id:"B",type:"revolute",unit:"deg",parent:"A",axis:"local +Z"})
]);
function safeValue(id,value){if(!Object.prototype.hasOwnProperty.call(limits,id))throw Error("UNKNOWN_AXIS:"+id);if(!Number.isFinite(value))throw Error("NON_FINITE_AXIS:"+id);const [lo,hi]=limits[id];if(value<lo||value>hi)throw RangeError("AXIS_OUT_OF_PREVIEW_RANGE:"+id);return value;}
function normalized(raw={}){const s={};for(const id of Object.keys(limits))s[id]=safeValue(id,raw[id]===undefined?0:Number(raw[id]));return s;}
function solve(raw={}){
 const a=normalized(raw);
 // These reference pivots are VISUAL units, not verified machine-specific mm.
 const linear=chain(tr(a.X/200,a.Y/200,a.Z/200),tr(0,.95,3.10));
 const head=chain(linear,ry(a.H));
 const spindle=chain(head,tr(0,0,-.55));
 const toolTip=point(chain(spindle,tr(0,0,-.84)));
 const cradle=chain(tr(0,0,1.0),rx(a.A));
 const platter=chain(cradle,tr(0,0,-.30),rz(a.B));
 return Object.freeze({
  values:Object.freeze(a),
  pivots:Object.freeze({linear,head,spindle,cradle,platter}),
  toolTip:Object.freeze(toolTip),
  platterCenter:Object.freeze(point(platter)),
  machineOutput:"BLOCKED",
  collisionGate:"NOT_IMPLEMENTED",
  materialRemovalGate:"NOT_IMPLEMENTED",
  precisionGate:"NOT_CALIBRATED"
 });
}
const api=Object.freeze({version:"1.0.0",joints,limits,identity:I,multiply:mul,translate:tr,rotateX:rx,rotateY:ry,rotateZ:rz,chain,point,solve,
 verifiedCncSafety:false,postMapping:null});
if(typeof module!=="undefined"&&module.exports)module.exports=api;
if(g)g.AIG_6AX_MECHANISM_CORE_V1=api;
})(typeof globalThis!=="undefined"?globalThis:null);
