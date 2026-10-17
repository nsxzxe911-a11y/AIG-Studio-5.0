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
const PRODUCT_FORBIDDEN_PAGES=Object.freeze(['4AX','5AX','6AX']);
const PRODUCT_PAGE_SET=new Set(PRODUCT_PAGE_IDS);
const PRODUCT_FORBIDDEN_SET=new Set(PRODUCT_FORBIDDEN_PAGES);
const RUNTIME_MESSAGE_SPECS=Object.freeze({
  'HOME.SYSTEM_MESSAGES':Object.freeze({messageId:'HOME.SYSTEM_MESSAGES',role:'status',ariaLive:'polite',runtimeTextRequired:true,defaultText:null})
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
function runtimeMessageSpec(messageId){
  const spec=RUNTIME_MESSAGE_SPECS[messageId];
  return spec?{...spec}:null;
}
function isProductPageAllowed(pageId){return PRODUCT_PAGE_SET.has(String(pageId||''));}
function removeNode(node){
  if(!node)return;
  if(typeof node.remove==='function'){node.remove();return;}
  if(node.parentNode&&typeof node.parentNode.removeChild==='function')node.parentNode.removeChild(node);
}
function decorateProductControl(node,context){
  if(!node||!node.dataset)return true;
  const tag=String(node.tagName||'').toUpperCase();
  const page=String(node.dataset.page||'');
  const target=String(node.dataset.openPage||'');
  if(page&&PRODUCT_FORBIDDEN_SET.has(page))return false;
  if(target&&PRODUCT_FORBIDDEN_SET.has(target))return false;
  if(tag!=='BUTTON')return true;
  if(context==='NAV'&&page&&PRODUCT_PAGE_SET.has(page)){
    const buttonId='NAV_'+page;
    node.dataset.buttonId=buttonId;
    node.dataset.commandId=PRODUCT_NAV_COMMANDS[buttonId];
    node.dataset.viewId='VIEW.NAV.'+page;
    node.dataset.nativeControl='true';
    return true;
  }
  if(target&&PRODUCT_PAGE_SET.has(target)){
    let buttonId='BTN.'+(context||'PRODUCT')+'.OPEN.'+target;
    let viewId='VIEW.'+(context||'PRODUCT')+'.OPEN.'+target;
    if(context==='HOME'&&['CAD','CAM','SIM','NC'].includes(target)){
      buttonId='BTN.HOME.CARD.'+target;
      viewId='VIEW.HOME.CARD.'+target;
    }else if(context==='HOME'){
      buttonId='BTN.HOME.QUICK.'+target;
      viewId='VIEW.HOME.QUICK.'+target;
    }
    node.dataset.buttonId=buttonId;
    node.dataset.commandId='OPEN_'+target;
    node.dataset.viewId=viewId;
    node.dataset.nativeControl='true';
  }
  return true;
}
function setRuntimeMessage(host,messageId,text){
  if(!host||typeof host.querySelector!=='function')return false;
  const selector='[data-message-id="'+String(messageId).replace(/"/g,'')+'"]';
  const el=host.querySelector(selector);
  if(!el)return false;
  el.textContent=text==null?'':String(text);
  el.dataset.runtimeText='true';
  return true;
}
function sanitizeProductScreen(node){
  if(!node||!node.dataset)return true;
  const page=String(node.dataset.page||'');
  if(page&&PRODUCT_FORBIDDEN_SET.has(page))return false;
  if(!PRODUCT_PAGE_SET.has(page)||typeof node.querySelectorAll!=='function')return true;
  node.querySelectorAll('[data-open-page]').forEach(control=>{
    if(!decorateProductControl(control,page))removeNode(control);
  });
  node.querySelectorAll('select option').forEach(option=>{
    const value=String(option.value||option.textContent||'').trim();
    if(PRODUCT_FORBIDDEN_SET.has(value))removeNode(option);
  });
  if(page==='HOME'&&typeof document!=='undefined'&&typeof document.createElement==='function'&&typeof node.querySelector==='function'){
    const home=node.querySelector('[data-home-runtime]');
    if(home&&!home.querySelector('[data-message-id="HOME.SYSTEM_MESSAGES"]')){
      const message=document.createElement('div');
      const spec=runtimeMessageSpec('HOME.SYSTEM_MESSAGES');
      message.className='notice aigAuthorityRuntimeMessage';
      message.dataset.messageId=spec.messageId;
      message.dataset.runtimeTextRequired='true';
      message.setAttribute('role',spec.role);
      message.setAttribute('aria-live',spec.ariaLive);
      message.textContent='';
      if(typeof home.appendChild==='function')home.appendChild(message);
      setRuntimeMessage(home,'HOME.SYSTEM_MESSAGES','LOCAL READY • AIG Authority Runtime message channel connected');
    }
  }
  return true;
}

function installAuthoritySkinV1(){
  if(typeof document==='undefined'||typeof document.createElement!=='function'||!document.head)return false;
  const cssId='aig-authority-home-v1-css';
  if(!document.getElementById(cssId)){
    const link=document.createElement('link');
    link.id=cssId;
    link.rel='stylesheet';
    link.href='./authority/aig-home-authority-v1.css';
    link.dataset.aigAuthoritySkin='AIG-AUTH-DESKTOP-HOME-V1';
    document.head.appendChild(link);
  }
  const apply=()=>{
    if(document.documentElement&&document.documentElement.classList)document.documentElement.classList.add('aigAuthoritySkinV1');
    document.title='AIG Authority RGB Runtime';
    if(typeof document.querySelector==='function'){
      const logo=document.querySelector('.brand .logo');
      const subtitle=document.querySelector('.brand small');
      if(logo)logo.textContent='AIG';
      if(subtitle)subtitle.textContent='AIG Authority RGB Runtime';
    }
  };
  if(document.readyState==='loading'&&typeof document.addEventListener==='function')document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
  return true;
}
function installProductDomGuard(){
  if(typeof document==='undefined') return;
  const allowed=new Set(PRODUCT_PAGE_IDS),utilities=new Set(['刀路','功能']);
  const guard=(host,extra,kind)=>{
    if(!host||host.dataset?.aigProductGuard==='1') return;
    const append=host.appendChild.bind(host);
    host.appendChild=function(node){
      const page=node&&node.dataset&&node.dataset.page;
      if(page&&!allowed.has(page)&&!(extra&&extra.has(page))) return node;
      if(kind==='NAV'&&!decorateProductControl(node,'NAV'))return node;
      if(kind==='SCREEN'&&page&&allowed.has(page)&&!sanitizeProductScreen(node))return node;
      return append(node);
    };
    if(host.dataset) host.dataset.aigProductGuard='1';
  };
  const nav=document.getElementById('nav'),screens=document.getElementById('screens');
  guard(nav,null,'NAV');
  guard(screens,utilities,'SCREEN');
  if(nav&&nav.style) nav.style.gridTemplateColumns='repeat(7,minmax(72px,1fr))';
}
installAuthoritySkinV1();
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
global.AIG_PRODUCT_FORBIDDEN_PAGES=PRODUCT_FORBIDDEN_PAGES;
global.AIG_PRODUCT_DECORATE_CONTROL=decorateProductControl;
global.AIG_PRODUCT_SANITIZE_SCREEN=sanitizeProductScreen;
global.AIG_RUNTIME_MESSAGE_SPEC=runtimeMessageSpec;
global.AIG_SET_RUNTIME_MESSAGE=setRuntimeMessage;
global.AIG_PAGE_COMMAND_ROUTES=ROUTES;
global.AIG_VIEW_ID_FOR_BUTTON=viewIdForButton;
global.AIG_NAV_VIEW_ID=navigationViewId;
global.AigPageRuntimeRouter=AigPageRuntimeRouter;
})(typeof window!=='undefined'?window:globalThis);
