/** FastModel 2.2 - display-only RGB scan palettes.
 * Source GLB materials/textures are never recolored; warnings are annotations,
 * never evidence that a skin seam/collision has passed or failed.
 */
export const SCAN_PALETTE_MODES=Object.freeze(['aig-rgb','inspection','low-glare']);
export const SCAN_WARNING_LEVELS=Object.freeze(['none','review','alarm']);
const palettes={
 'aig-rgb':{
  core:'#66E5FF',head:'#FF83C5',spine:'#64E4FF',arm:'#63F4B7',leg:'#B5A0FF',
  hair:'#FFCE7C',outline:'rgba(160,202,231,0.37)',headOutline:'rgba(255,153,199,0.47)',
  hairOutline:'rgba(255,202,125,0.42)',unknown:'#A6BDCF',
  review:'#FFB45B',alarm:'#FF6477'
 },
 inspection:{
  core:'#E8EDF2',head:'#F4DDA6',spine:'#F0F3FF',arm:'#A7D6ED',leg:'#B5C6DE',
  hair:'#D9BCAA',outline:'rgba(212,223,232,0.42)',headOutline:'rgba(239,219,175,0.44)',
  hairOutline:'rgba(225,192,157,0.38)',unknown:'#D2D9E0',
  review:'#FFC56B',alarm:'#FF6477'
 },
 'low-glare':{
  core:'#91BBC5',head:'#BFA8C5',spine:'#83B9C5',arm:'#91C7B7',leg:'#ADB2CC',
  hair:'#C6B19B',outline:'rgba(158,173,187,0.28)',headOutline:'rgba(193,170,199,0.34)',
  hairOutline:'rgba(198,177,155,0.30)',unknown:'#A5B8C3',
  review:'#E0B079',alarm:'#E58A94'
 }
};
export function scanPalette(mode='aig-rgb'){
 if(!SCAN_PALETTE_MODES.includes(mode))throw Error('SCAN_PALETTE_INVALID');
 return Object.freeze({...palettes[mode]});
}
export function scanSemanticGroup(role){
 // Never classify unknown anatomical parts from skin index, colors or name.
 if(!role||typeof role!=='string')return 'unknown';
 const label=role.toLowerCase();
 if(['head','neck','face','scalp','head-neck','cranium','jaw'].includes(label))return 'head';
 if(['spine','pelvis','hip','chest','torso','core','shoulder-center'].includes(label))return 'spine';
 if(['arm','hand','left-arm','right-arm','wrist','elbow','shoulder','finger'].includes(label))return 'arm';
 if(['leg','foot','left-leg','right-leg','knee','ankle','toe'].includes(label))return 'leg';
 if(['hair','hair-root','strand','hair-strand'].includes(label))return 'hair';
 return 'unknown';
}
export function scanColor(role,{palette='aig-rgb',line='bone',warning='none',highlightRoles=[]}={}){
 if(!SCAN_WARNING_LEVELS.includes(warning))throw Error('SCAN_WARNING_INVALID');
 const p=scanPalette(palette),group=scanSemanticGroup(role);
 if(line!=='bone'&&line!=='outline')throw Error('SCAN_COLOR_LINE_INVALID');
 if(warning!=='none'&&Array.isArray(highlightRoles)&&highlightRoles.includes(group))return p[warning];
 if(line==='outline')return group==='head'?p.headOutline:group==='hair'?p.hairOutline:p.outline;
 return p[group]||p.unknown;
}
export function scanColorLegend(mode='aig-rgb'){
 const p=scanPalette(mode);
 return [
  {id:'head',title:'頭／頸',color:p.head,kind:'solid'},
  {id:'spine',title:'軀幹骨架',color:p.spine,kind:'solid'},
  {id:'arm',title:'手臂',color:p.arm,kind:'solid'},
  {id:'leg',title:'腿部',color:p.leg,kind:'solid'},
  {id:'outline',title:'外型輪廓',color:p.outline,kind:'dashed'},
  {id:'review',title:'待人工檢查',color:p.review,kind:'warning'},
  {id:'alarm',title:'已確認警示色（非檢測結論）',color:p.alarm,kind:'warning'}
 ];
}
