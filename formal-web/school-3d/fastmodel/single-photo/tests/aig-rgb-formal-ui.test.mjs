import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('FastModel retains one RGB glass language with CNC controls, no engineering-shell fallback',()=>{
 const tokens={
  background:'#020407',panel:'#07111b',text:'#f4fbff',
  accent:'#27e9ff',cutting:'#33f39b',rapid:'#ff4da6',
  warning:'#ffb326',alarm:'#ff465f',disabled:'#54606a'
 };
 const css=html.slice(html.indexOf('<style>')+7,html.indexOf('</style>'));
 assert.ok(css.includes('AIG RGB Glass formal family'));
 for(const [name,color] of Object.entries(tokens)){
  assert.ok(css.includes('--aig-rgb-'+name+':'+color+';'),
   'shared CNC/FastModel token mismatch: '+name);
 }
 assert.ok(css.includes('button:disabled{border-color:var(--aig-rgb-disabled)'));
 assert.ok(css.includes('button:focus-visible,input:focus-visible'));
 assert.ok(css.includes('#aig-unified-tabs [aria-selected="true"]'));
 assert.ok(css.includes('#aig693-progress[data-aig-state="complete"]'));
 assert.ok(css.includes('#aig693-progress[data-aig-state="error"]'));
 assert.ok(css.includes('@media(max-width:760px)'));
 assert.ok(css.includes('#aig-unified-tabs button{min-height:44px}'));
 for(const id of ['aig65-build','aig65-play','aig65-stop','aig65-record',
  'aig68-review','aig65-report','aig64-single-build','local-glb']){
  const found=(html.match(new RegExp('id="'+id+'"','g'))||[]).length;
  assert.equal(found,1,'Never replace or duplicate a real callback DOM ID: '+id);
 }
});
