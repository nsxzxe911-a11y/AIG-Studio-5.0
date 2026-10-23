import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=new URL('../authority/aig-real3d-human-brown-render-v1.json',import.meta.url);
const c=JSON.parse(readFileSync(source,'utf8'));
const graph=c.render_graph;
test('User-approved AI-first pass order locked, later fine cavity passes deferred',()=>{
 assert.equal(c.schema,'AIG_REAL3D_HUMAN_BROWN_RENDER_CONTRACT_V1');
 assert.equal(c.approval.user_approved_order,true);
 assert.equal(c.approval.priority,'AI_BASELINE_FIRST');
 assert.deepEqual(graph.map(x=>x.id),[
  'REAL3D.GATE.GEOMETRY','REAL3D.PASS.OUTLINE',
  'REAL3D.PASS.BROWN_BASE','REAL3D.PASS.VOLUME_SHADOW',
  'REAL3D.PASS.HIGHLIGHT','REAL3D.GATE.VISUAL_HUMAN',
  'REAL3D.PASS.SCENE_FX'
 ]);
 assert.deepEqual(graph.map(x=>x.order),[0,1,2,3,4,5,6]);
 assert.equal(c.followup_user_idea.preserved,true);
 assert.equal(c.followup_user_idea.approved_as_immediate_implementation,false);
 assert.equal(c.followup_user_idea.priority,'AFTER_AI_BASELINE_ALL_4_PASSES');
 assert.equal(c.approval.technical_implementation_fully_complete,false);
});
test('Coffee-brown opaque body and one black outline, not white/RGB/wireframe',()=>{
 const p=c.palette;
 assert.match(p.skin_base,/^#[0-9A-Fa-f]{6}$/);
 assert.match(p.outline,/^#[0-9A-Fa-f]{6}$/);
 assert.ok(p.skin_base!=='#FFFFFF'&&p.skin_base!=='#ffffff');
 assert.equal(p.opaque_base_alpha,1);
 assert.equal(p.white_human_base_forbidden,true);
 assert.equal(p.rgb_human_base_forbidden,true);
 assert.equal(p.film_fx_separate_from_human,true);
 const outline=graph[1],brown=graph[2];
 assert.equal(outline.kind,'SCREEN_SPACE_SILHOUETTE_BORDER');
 assert.equal(outline.outline_width_px_at_1080p,2);
 assert.ok(outline.forbidden.includes('INTERIOR_TRIANGLE_WIREFRAME'));
 assert.equal(brown.kind,'OPAQUE_UNLIT_MATERIAL');
 assert.equal(brown.base_color,p.skin_base);
 assert.ok(brown.forbidden.includes('WIREFRAME_ONLY'));
 assert.ok(brown.forbidden.includes('WHITE_BODY'));
 assert.ok(brown.forbidden.includes('RAINBOW_BODY'));
});
test('Human appearance cannot pass from synthetic fixture or GPU screenshot alone',()=>{
 assert.equal(c.authority.forbid_reclassification_of_legacy_fixture_as_authentic_human,true);
 assert.equal(graph[5].cannot_be_passed_by_synthetic_nonhuman_fixture,true);
 assert.ok(graph[5].reviews.includes('HAND_WITH_FIVE_FINGERS'));
 assert.ok(graph[5].reviews.includes('KNEE_ANKLE_FOOT_TOES'));
 assert.equal(c.acceptance.no_false_pass_from_gpu_success,true);
 assert.equal(c.acceptance.production_visual_gate,
  'BLOCK_PENDING_REAL_HUMAN_SOURCE_AND_4_VIEW_REVIEW');
 assert.equal(c.status,'FORMAL_SPEC_APPROVED_RUNTIME_PENDING');
});
test('No source geometry mutations or FX before human visual acceptance',()=>{
 assert.equal(graph[3].affect_geometry,false);
 assert.equal(graph[6].enabled_in_v1,false);
 assert.equal(graph[6].status,'DEFERRED_UNTIL_VISUAL_HUMAN_PASS');
 assert.ok(graph[6].forbidden.includes('HUMAN_BODY_BLOOM'));
 assert.equal(c.fixed_camera.projection,'orthographic');
 assert.equal(c.fixed_camera.stable_source_hash,true);
 assert.equal(c.acceptance.original_aig_home_untouched,true);
 assert.equal(c.acceptance.cnc_3_to_6_ax_and_nc_untouched,true);
 assert.equal(c.acceptance.live_deploy,false);
 assert.equal(c.acceptance.apks_exes_claimed_built,false);
});
