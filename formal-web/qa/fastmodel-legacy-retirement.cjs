// AIG formal website: never reintroduce the retired FastModel 6.9.5
// photo-only/2.5D sway product entry. 3D technical source/vault stays safe.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const site=path.resolve(__dirname,'..');
const home=fs.readFileSync(path.join(site,'index.html'),'utf8');
const newHome=fs.readFileSync(path.join(site,'aig-new-home.html'),'utf8');
assert.doesNotMatch(home,/href=["']\.\/fastmodel\//i,
 'OFFICIAL_HOME_MUST_NOT_LINK_TO_OLD_PHOTO_SWAY_APP');
assert.doesNotMatch(home,/FastModel 6\.9\.5\s*[｜|]/,
 'OFFICIAL_HOME_MUST_NOT_RECOMMEND_UNVERIFIED_6_9_5');
assert.doesNotMatch(newHome,/href=["']\.\/fastmodel\//i,
 'NEW_HOME_MUST_NOT_LINK_TO_RETIRED_APP');
assert.doesNotMatch(newHome,/class=["']card fast["']/i,
 'NEW_HOME_FAKE_APP_CARD_REAPPEARED');
assert.equal(fs.existsSync(path.join(site,'fastmodel','index.html')),false,
 'OLD_FASTMODEL_PUBLIC_HTML_MUST_REMAIN_REMOVED');
assert.equal(fs.existsSync(path.join(site,'fastmodel','app.js')),false,
 'OLD_FASTMODEL_PHOTO_SWAY_BUNDLE_MUST_REMAIN_REMOVED');
assert.ok(fs.existsSync(path.join(site,'fastmodel','DEPLOYMENT.md')),
 'RETIREMENT_PROVENANCE_MUST_REMAIN');
// Engine source lives on the separate FastModel development branch;
// this public site retirement Gate must not conflate release source trees.
console.log('AIG_FORMAL_SITE_FASTMODEL_LEGACY_RETIRED_NO_FAKE_ENTRY_PASS');
