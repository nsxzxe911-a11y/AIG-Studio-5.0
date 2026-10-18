/* AIG-II + Studio 5.0 shared manual CAM 3AX, local deterministic segments.
   This creates Web CAM paths, never a verified NC post or machine command.
   A/B/C and simultaneous XYZ ramps are rejected, not approximated. */
(function(global){
"use strict";
const MAX_LINES=1600,MAX_SEGMENTS=1200,PRECISION=.001;
function num(x,label){
 const v=Number(x);
 if(!Number.isFinite(v)||Math.abs(v)>100000)throw Error(label+" 必須為有效且合理的毫米數值");
 return v;
}
function parseManual(text,params){
 const src=String(text||"");
 if(src.length>130000)throw Error("手動刀路內容太大");
 const lines=src.replace(/\r/g,"").split("\n");
 if(lines.length>MAX_LINES)throw Error("最多允許 "+MAX_LINES+" 行");
 const safe=num(params?.safeZ,"Safe-Z"),top=num(params?.stockTop,"頂面"),thick=num(params?.stockThickness,"毛坯厚度");
 const feed=num(params?.feed,"進給"),rpm=num(params?.rpm,"轉速"),tool=num(params?.toolDia,"刀具直徑");
 if(thick<=0||feed<=0||rpm<=0||tool<=0||safe<=top)throw Error("毛坯、進給、轉速、刀徑或 Safe-Z 參數有誤");
 const result=[],nodes=[],warnings=[];
 let pos={X:0,Y:0,Z:safe},previousRapid=false,hadPosition=false,entered=false;
 for(let i=0;i<lines.length;i++){
  const raw=lines[i].replace(/;.*$/,"").replace(/\([^)]*\)/g,"").trim().toUpperCase();
  if(!raw)continue;
  const words=raw.replace(/([A-Z])\s+([+-]?\d)/g,"$1$2").match(/[A-Z][+-]?(?:\d+(?:\.\d*)?|\.\d+)/g)||[];
  const cleaned=raw.replace(/[A-Z][+-]?(?:\d+(?:\.\d*)?|\.\d+)/g,"").replace(/\s+/g,"");
  if(cleaned)throw Error("第 "+(i+1)+" 行包含不支援內容："+cleaned);
  const values={};for(const word of words){const key=word[0];if(!["G","X","Y","Z","F"].includes(key))throw Error("第 "+(i+1)+" 行不支援 "+key+" 軸或指令；A/B/C 應由對應 NC-first 模組驗證");if(Object.prototype.hasOwnProperty.call(values,key))throw Error("第 "+(i+1)+" 行有重複 "+key+" 欄位");values[key]=num(word.slice(1),key);}
  if(!("G" in values))throw Error("第 "+(i+1)+" 行請明確標明 G0 或 G1");
  if(values.G!==0&&values.G!==1)throw Error("第 "+(i+1)+" 行僅支援 G0 / G1");
  if("F" in values&&values.F<=0)throw Error("第 "+(i+1)+" 行進給 F 必須大於 0；已阻擋負值或零進給");
  const rapid=values.G===0,to={X:"X" in values?values.X:pos.X,Y:"Y" in values?values.Y:pos.Y,Z:"Z" in values?values.Z:pos.Z};
  if(!hadPosition&& !rapid)throw Error("第 "+(i+1)+" 行必須先有 G0 安全定位");
  if(rapid&&to.Z<safe-PRECISION/10)throw Error("第 "+(i+1)+" 行 G0 快速移動不可低於 Safe-Z "+safe.toFixed(3)+"；請改用 G1 下刀");
  if(rapid&&(Math.abs(to.X-pos.X)>PRECISION/10||Math.abs(to.Y-pos.Y)>PRECISION/10)&&Math.min(pos.Z,to.Z)<safe-PRECISION/10)throw Error("第 "+(i+1)+" 行 G0 XY 低於 Safe-Z，已阻擋");
  if(!rapid&&to.Z<top-thick-PRECISION/10)throw Error("第 "+(i+1)+" 行刀具超過毛坯底面");
  const xyMoved=Math.hypot(to.X-pos.X,to.Y-pos.Y)>PRECISION/10,zMoved=Math.abs(to.Z-pos.Z)>PRECISION/10;
  if(!rapid&&!xyMoved&&!zMoved)throw Error("第 "+(i+1)+" 行 G1 沒有座標位移，不建立假切削段");
  if(!rapid&&xyMoved&&zMoved)throw Error("第 "+(i+1)+" 行同時 XYZ 斜向切削尚未提供可驗證刀具掃掠；請拆成下刀與 XY 走刀");
  if(!rapid&&xyMoved&&to.Z>top+PRECISION/10)warnings.push("第 "+(i+1)+" 行 XY 在毛坯上方，不會移除材料");
  nodes.push({g:rapid?"G0":"G1",x:to.X,y:to.Y,z:to.Z,f:"F" in values?values.F:feed,line:i+1});
  if(!rapid){
   const path={kind:"manual",points:xyMoved?[{x:pos.X,y:pos.Y},{x:to.X,y:to.Y}]:[{x:to.X,y:to.Y}],
     nodes:[{g:"G1",x:pos.X,y:pos.Y,z:pos.Z},{g:"G1",x:to.X,y:to.Y,z:to.Z}],
     depth:to.Z,feed:"F" in values?values.F:feed,rpm,safeZ:safe,closed:false,routeMode:"MANUAL",sourceId:"MANUAL_L"+(i+1)};
   result.push(path);if(result.length>MAX_SEGMENTS)throw Error("超過 "+MAX_SEGMENTS+" 切削段上限");
   entered=true;
  }
  hadPosition=true;previousRapid=rapid;pos=to;
 }
 if(!entered)throw Error("尚未建立任何 G1 切削段，請檢查程式");
 if(pos.Z<safe-PRECISION/10)warnings.push("最後刀具低於 Safe-Z；請補 G0 Z 安全退刀");
 return {paths:result,nodes,warnings,source:"MANUAL",precision:PRECISION,verified:false,
   axisMode:"3AX",endPosition:pos};
}
global.AigManualCam=Object.freeze({parseManual,MAX_LINES,MAX_SEGMENTS,PRECISION});
})(typeof window!=="undefined"?window:globalThis);
