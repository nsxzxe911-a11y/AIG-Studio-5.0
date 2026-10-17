(function(global){
'use strict';

const PAGE_IDS=Object.freeze(['HOME','CAD','CAM','SIM','3AX','4AX','5AX','6AX','NC','AI']);
const NAVIGATION=Object.freeze({
  NAV_HOME:'HOME',NAV_CAD:'CAD',NAV_CAM:'CAM',NAV_SIM:'SIM',NAV_3AX:'3AX',
  NAV_4AX:'4AX',NAV_5AX:'5AX',NAV_6AX:'6AX',NAV_NC:'NC',NAV_AI:'AI'
});
const PRODUCT_PAGE_IDS=Object.freeze(['HOME','CAD','CAM','SIM','3AX','NC','AI']);
const PRODUCT_NAVIGATION=Object.freeze({
  NAV_HOME:'HOME',NAV_CAD:'CAD',NAV_CAM:'CAM',NAV_SIM:'SIM',NAV_3AX:'3AX',NAV_NC:'NC',NAV_AI:'AI'
});
const PRODUCT_NAV_COMMANDS=Object.freeze({
  NAV_HOME:'OPEN_HOME',NAV_CAD:'OPEN_CAD',NAV_CAM:'OPEN_CAM',NAV_SIM:'OPEN_SIM',
  NAV_3AX:'OPEN_3AX',NAV_NC:'OPEN_NC',NAV_AI:'OPEN_AI'
});
function viewIdForButton(buttonId){return 'VIEW.'+buttonId;}
function navigationViewId(buttonId){
  if(!NAVIGATION[buttonId]) throw new Error('Unknown production navigation Button ID: '+buttonId);
  return 'VIEW.NAV.'+buttonId.replace(/^NAV_/, '');
}
function buttonIdForView(viewId){
  if(typeof viewId!=='string'||!viewId.startsWith('VIEW.')||viewId.startsWith('VIEW.NAV.')) throw new Error('Unknown page View ID: '+viewId);
  const buttonId=viewId.slice(5);
  if(!ROUTES[buttonId]||viewIdForButton(buttonId)!==viewId) throw new Error('Unknown page View ID: '+viewId);
  return buttonId;
}
function navigationButtonId(viewId){
  if(typeof viewId!=='string'||!viewId.startsWith('VIEW.NAV.')) throw new Error('Unknown navigation View ID: '+viewId);
  const buttonId='NAV_'+viewId.slice('VIEW.NAV.'.length);
  if(!NAVIGATION[buttonId]||navigationViewId(buttonId)!==viewId) throw new Error('Unknown navigation View ID: '+viewId);
  return buttonId;
}

function installProductDomGuard(){
  if(typeof document==='undefined') return;
  const allowed=new Set(PRODUCT_PAGE_IDS),utilities=new Set(['刀路','功能']);
  const guard=(host,extra)=>{
    if(!host||host.dataset?.aigProductGuard==='1') return;
    const append=host.appendChild.bind(host);
    host.appendChild=function(node){
      const page=node&&node.dataset&&node.dataset.page;
      if(page&&!allowed.has(page)&&!(extra&&extra.has(page))) return node;
      return append(node);
    };
    if(host.dataset) host.dataset.aigProductGuard='1';
  };
  const nav=document.getElementById('nav'),screens=document.getElementById('screens');
  guard(nav,null);
  guard(screens,utilities);
  if(nav&&nav.style) nav.style.gridTemplateColumns='repeat(7,minmax(72px,1fr))';
}
installProductDomGuard();

const ROUTES=Object.create(null);
function add(buttonId,pageId,subpageId){
  if(ROUTES[buttonId]) throw new Error('Duplicate Web Button ID: '+buttonId);
  ROUTES[buttonId]=Object.freeze({viewId:viewIdForButton(buttonId),buttonId,pageId,subpageId,commandId:buttonId});
}

add('HOME.PROJECTS.OPEN','HOME','HOME.PROJECTS');
add('HOME.PROJECTS.NEW','HOME','HOME.PROJECTS');
add('HOME.PROJECTS.SAVE','HOME','HOME.PROJECTS');
add('HOME.SETTINGS.OPEN','HOME','HOME.SETTINGS');
add('HOME.SYNC.STATUS','HOME','HOME.MAIN');

['LINE','RECT','CIRCLE','ARC','HOLE'].forEach(x=>add('CAD.DRAW.'+x,'CAD','CAD.DRAW'));
['TRIM','EXTEND','OFFSET','ARRAY','CHAMFER','FILLET','UNDO','REDO'].forEach(x=>add('CAD.EDIT.'+x,'CAD','CAD.EDIT'));
['OPEN','SAVE','IMPORT','EXPORT'].forEach(x=>add('CAD.FILE.'+x,'CAD','CAD.FILE'));
add('CAD.PHOTO.ALIGN','CAD','CAD.PHOTO');
add('CAD.PHOTO.SCALE','CAD','CAD.PHOTO');
add('CAD.VIEW.SNAP','CAD','CAD.VIEW');

['GENERATE','ROUGH','FINISH','CONTOUR','DRILL'].forEach(x=>add('CAM.AUTO.'+x,'CAM','CAM.AUTO'));
['ADD_POINT','EDIT_POINT','DELETE_POINT','SET_MOTION_G0','SET_MOTION_G1','SET_SAFE_Z'].forEach(x=>add('CAM.MANUAL.'+x,'CAM','CAM.MANUAL'));
add('CAM.MAIN.COMP_G41','CAM','CAM.MAIN');
add('CAM.MAIN.COMP_G42','CAM','CAM.MAIN');
add('CAM.TOOL.SELECT','CAM','CAM.TOOL');
add('CAM.REGION.SELECT','CAM','CAM.REGION');
add('CAM.POST_PREVIEW.GENERATE','CAM','CAM.POST_PREVIEW');

['PLAY','PAUSE','SINGLE_BLOCK','STOP','RESET'].forEach(x=>add('SIM.PLAYBACK.'+x,'SIM','SIM.PLAYBACK'));
add('SIM.MATERIAL.RUN','SIM','SIM.MATERIAL');
add('SIM.COLLISION.CHECK','SIM','SIM.COLLISION');
add('SIM.MAIN.VIEW_3D','SIM','SIM.MAIN');
add('SIM.RESULT.ACCEPT','SIM','SIM.RESULT');

function addAxis(page,axes){
  add(page+'.MACHINE.VIEW',page,page+'.MACHINE');
  add(page+'.MACHINE.HOME_VIEW',page,page+'.MACHINE');
  add(page+'.NC_FIRST.OPEN',page,page+'.NC_FIRST');
  add(page+'.NC_FIRST.PARSE',page,page+'.NC_FIRST');
  add(page+'.NC_FIRST.PREVIEW',page,page+'.NC_FIRST');
  axes.forEach(axis=>{
    add(page+'.MACHINE.JOG_'+axis+'_POS',page,page+'.MACHINE');
    add(page+'.MACHINE.JOG_'+axis+'_NEG',page,page+'.MACHINE');
  });
}
addAxis('3AX',['X','Y','Z']);
addAxis('4AX',['X','Y','Z','A']);
addAxis('5AX',['X','Y','Z','A','B']);
addAxis('6AX',['X','Y','Z','A','B','C']);

['INSERT','DELETE','BLOCK_SKIP','CUSTOM_M_CODE'].forEach(x=>add('NC.EDITOR.'+x,'NC','NC.EDITOR'));
add('NC.PARSER.PARSE','NC','NC.PARSER');
add('NC.PREVIEW.RENDER','NC','NC.PREVIEW');
['RUN','SINGLE_BLOCK','DRY_RUN'].forEach(x=>add('NC.VERIFY.'+x,'NC','NC.VERIFY'));
add('NC.OUTPUT.PREPARE','NC','NC.OUTPUT');
add('NC.OUTPUT.SEND_MACHINE','NC','NC.OUTPUT');

add('AI.ASSIST.EXPLAIN','AI','AI.ASSIST');
add('AI.PLAN.BUILD','AI','AI.PLAN');
add('AI.PLAN.OPTIMIZE','AI','AI.PLAN');
add('AI.AUDIT.RUN','AI','AI.AUDIT');
add('AI.RECOVERY.REPLAN','AI','AI.RECOVERY');

class AigPageRuntimeRouter {
  constructor({runtimeProvider,pageNavigator,resultSink,messageSink}={}){
    this.runtimeProvider=runtimeProvider||(()=>null);
    this.pageNavigator=pageNavigator||(()=>{});
    this.resultSink=resultSink||(()=>{});
    this.messageSink=messageSink||(()=>{});
  }
  navigate(buttonId){
    const pageId=NAVIGATION[buttonId];
    if(!pageId) throw new Error('Unknown production navigation Button ID: '+buttonId);
    this.pageNavigator(pageId);
    return pageId;
  }
  navigateView(viewId){return this.navigate(navigationButtonId(viewId));}
  dispatchView(viewId,args={}){return this.dispatchButton(buttonIdForView(viewId),args);}
  dispatchButton(buttonId,args={}){
    const route=ROUTES[buttonId];
    if(!route) throw new Error('Unknown page Button ID: '+buttonId);
    const runtime=this.runtimeProvider(route.pageId);
    if(!runtime || typeof runtime.dispatch!=='function'){
      return {type:'REJECTED',pageId:route.pageId,code:'PAGE_RUNTIME_UNAVAILABLE',revision:0,detail:'No runtime registered for '+route.pageId};
    }
    const before=typeof runtime.messages==='function' ? runtime.messages().length : 0;
    const result=runtime.dispatch({page:route.pageId,subpage:route.subpageId,commandId:route.commandId,arguments:{...args}});
    this.resultSink(result);
    if(typeof runtime.messages==='function') runtime.messages().slice(before).forEach(this.messageSink);
    return result;
  }
  static route(buttonId){ return ROUTES[buttonId]||null; }
  static inventory(){ return Object.keys(ROUTES).sort(); }
  static viewIdForButton(buttonId){ if(!ROUTES[buttonId]) throw new Error('Unknown page Button ID: '+buttonId); return viewIdForButton(buttonId); }
}

Object.freeze(ROUTES);
global.AIG_PAGE_IDS=PAGE_IDS;
global.AIG_PAGE_NAVIGATION=NAVIGATION;
global.AIG_PRODUCT_PAGE_IDS=PRODUCT_PAGE_IDS;
global.AIG_PRODUCT_PAGE_NAVIGATION=PRODUCT_NAVIGATION;
global.AIG_PRODUCT_NAV_COMMAND_ID=PRODUCT_NAV_COMMANDS;
global.AIG_PAGE_COMMAND_ROUTES=ROUTES;
global.AIG_VIEW_ID_FOR_BUTTON=viewIdForButton;
global.AIG_NAV_VIEW_ID=navigationViewId;
global.AigPageRuntimeRouter=AigPageRuntimeRouter;
})(typeof window!=='undefined'?window:globalThis);
