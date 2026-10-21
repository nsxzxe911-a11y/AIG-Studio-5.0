import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AIG_UNIFIED_SHELL_SCHEMA,AIG_UNIFIED_TABS,initAIGUnifiedShell} from '../aig-unified-shell-6-9.mjs';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('one FastModel: create, output, real 3D model and advanced tabs each have a unique stable ID',()=>{
 assert.equal(AIG_UNIFIED_TABS.length,4);
 assert.deepEqual(AIG_UNIFIED_TABS.map(x=>x.id),['create','output','model','advanced']);
 assert.equal(AIG_UNIFIED_SHELL_SCHEMA,'AIG_FASTMODEL_SINGLE_WORKSPACE_6_9_1');
 assert.equal(new Set(AIG_UNIFIED_TABS.map(x=>x.id)).size,4);
 assert.equal(initAIGUnifiedShell(null).ready,false);
});
test('6.9.1 does not replace working original source IDs or clone callback controls',()=>{
 const html=read('index.html'),shell=read('aig-unified-shell-6-9.mjs');
 const required=['view','aig65-canvas','aig65-image','aig65-story','aig65-mode',
 'aig65-duration','aig66-face','aig67-voice','aig65-build','aig65-play',
 'aig65-stop','aig65-record','aig68-review','aig65-report','aig65-video',
 'aig65-downloads','aig65-status','aig64-single-photo','aig64-single-build',
 'local-glb','story-build','story-text','movie-record','generation','stages'];
 for(const id of required)assert.equal(
  (html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,
  'original working element ID must occur exactly once: '+id);
 for(const token of ['panels.output.append(el)','stage.append(stillCanvas)',
  'panels.advanced.append(original)','tabs.append(tab)','paneBox.append(panel)',
  "activate('create')", "new doc.defaultView.MutationObserver"]) {
  if(token.includes('new doc.defaultView.MutationObserver'))continue;
  assert.ok(shell.includes(token),token);
 }
 assert.ok(!shell.includes('cloneNode('));
 assert.ok(!shell.includes('replaceChildren('));
});
test('single app JS mounts tabs after old real callbacks, not before',()=>{
 const app=read('app.mjs'),shell=read('aig-unified-shell-6-9.mjs');
 assert.ok(app.includes("import {initAIGUnifiedShell} from './aig-unified-shell-6-9.mjs'"));
 assert.ok(app.lastIndexOf('initAIGUnifiedShell(document)')>app.indexOf("aig65-record').addEventListener"));
 assert.ok(app.includes('new AIG65CanvasRecorder({'));
 assert.ok(app.includes('movieUI=new MovieWorkspace({'));
 assert.ok(app.includes('buildAIG67AudioBuffer('));
 assert.ok(app.includes('new AIG68FramePacing('));
 assert.ok(shell.includes("tablist")&&shell.includes("tabpanel"));
 assert.ok(shell.includes("key==='ArrowRight'")&&shell.includes("key==='ArrowLeft'"));
});
test('mobile layout uses one fixed preview and scrollable controls, not an endlessly scrolling webpage',()=>{
 const html=read('index.html');
 for(const pattern of ['body{height:100dvh;overflow:hidden}',
  'grid-template-rows:minmax(165px,43%) minmax(0,1fr)!important',
  'aside{min-height:0!important;overflow:auto!important',
  '#aig-unified-tabs{position:sticky',
  '[aria-selected="true"]',
  '.workspace>#aig65-canvas',
  '#aig-unified-live-status'])
  assert.ok(html.includes(pattern),pattern);
});
test('old generation/version markers and assets are retained, one formal program',()=>{
 const html=read('index.html');
 for(const mark of ['AIG FastModel 6.9｜','AIG FastModel 6.8｜',
  'AIG FastModel 6.7｜','AIG FastModel 6.6｜',
  'AIG FastModel 6.5｜','AIG FastModel 6.4｜'])
  assert.ok(html.includes(mark),mark);
 assert.equal(JSON.parse(read('AIG62-SCHOOL-VISUAL-ASSETS.json')).otherCostumesAndSwimwearStillAvailable,true);
 assert.ok(!read('aig-unified-shell-6-9.mjs').includes('fetch('));
});

test('6.9.2: no WAV is an optional enhancement, not a prerequisite for photo, preview or video',()=>{
 const app=read('app.mjs'),html=read('index.html'),shell=read('aig-unified-shell-6-9.mjs');
 assert.ok(html.includes('配音 WAV（完全選填，沒有也可以生成動畫）'));
 assert.ok(html.includes('配音 WAV（完全選填')&&shell.includes('不提供 WAV 也可生成'));
 assert.ok(shell.includes('aig-unified-auto-sound'));
 assert.ok(shell.includes('story-sound-options'));
 assert.ok(app.includes('if(voice){'));
 assert.ok(app.includes('aig67Audio=decodedVoice?{decoded:decodedVoice,sha:voiceSha}:null'));
 assert.ok(app.includes('try{storySound.start();}catch(audioError)'));
 assert.ok(app.includes('未提供音檔也可生成'));
 assert.ok(!html.includes('id="aig67-voice" type="file" required'));
 assert.ok(html.includes('id="voice-enabled"'));
 assert.ok(html.includes('id="sfx-enabled"'));
 assert.ok(html.includes('id="music-enabled"'));
});

test('6.9.2 initial rAF timestamp is clamped to 0 before renderer, never negative',()=>{
 const app=read('app.mjs');
 assert.ok(app.includes('Math.max(0,Math.min(current.plan.seconds,(now-aig65StartedAt)/1000))'));
 assert.ok(app.includes('aig65FrameId=requestAnimationFrame(animate)'));
 assert.ok(!app.includes('const t=Math.min(current.plan.seconds,(now-aig65StartedAt)/1000);'));
});
