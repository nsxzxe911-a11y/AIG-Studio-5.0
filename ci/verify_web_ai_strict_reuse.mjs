globalThis.document={readyState:'complete',querySelectorAll:()=>[]};
await import('../web/runtime/page-runtime-router.js');
await import('../web/runtime/ai-page-runtime.js');

function plan(extra){
  return globalThis.aigWebMachiningPlan({
    objective:'MIN_REWORK',targetAxis:'3AX',
    hasNcProgram:'true',hasCadGeometry:'true',hasManualCamArtifact:'true',hasCamToolpath:'true',
    simVerified:'true',simRevision:'12',simDigest:'sim12',simAxis:'3AX',
    ncVerified:'true',ncRevision:'20',ncDigest:'nc20',ncAxis:'3AX',
    ...extra
  });
}

const legacy=plan({});
if(legacy.routeKind==='REUSE_VERIFIED_STAGE') throw new Error('WEB_AI_LEGACY_SIM_EVIDENCE_REUSED');
const strict=plan({simPreflightReady:'true',simFixtureCoverageKnown:'true'});
if(strict.routeKind!=='REUSE_VERIFIED_STAGE') throw new Error('WEB_AI_STRICT_SIM_EVIDENCE_NOT_REUSED');
const unsafe=strict.considered.find(x=>x.routeKind==='REUSE_VERIFIED_STAGE');
if(!unsafe || !unsafe.eligible) throw new Error('WEB_AI_STRICT_REUSE_NOT_ELIGIBLE');
let multiAxisBlocked=false;
try{globalThis.aigWebMachiningPlan({targetAxis:'6AX',hasNcProgram:'true'});}catch(_){multiAxisBlocked=true;}
if(!multiAxisBlocked) throw new Error('WEB_AI_MULTI_AXIS_PRODUCT_GUARD_MISSING');
console.log('WEB_AI_STRICT_REUSE_PASS|VERIFIED|PREFLIGHT|FIXTURE_COVERAGE|LEGACY_REJECTED');
