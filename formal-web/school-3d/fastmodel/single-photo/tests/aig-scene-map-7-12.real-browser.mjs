/** Chromium phone+desktop offline scene map: user-supplied GeoJSON, source
 * attribution, proportions and locally drawn tree. Never live GPS search.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const folder='artifacts/fastmodel-map-7-12';await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const device of [
  {name:'phone',viewport:{width:360,height:780},isMobile:true,hasTouch:true},
  {name:'desktop',viewport:{width:1440,height:900}}
 ]){
  const page=await browser.newPage({...device,deviceScaleFactor:1,acceptDownloads:true});
  page.setDefaultTimeout(25000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://127.0.0.1:8765/scene-map-studio.html',{waitUntil:'load'});
   assert.equal(JSON.parse(await page.locator('#map-details').textContent()).features,0);
   const geo={type:'FeatureCollection',features:[
    {type:'Feature',properties:{name:'Surveyed building footprint',category:'building'},
     geometry:{type:'Polygon',coordinates:[[[121.5,25.03],[121.5002,25.03],
      [121.5002,25.0302],[121.5,25.0302],[121.5,25.03]]]}},
    {type:'Feature',properties:{name:'Street',category:'road'},
     geometry:{type:'LineString',coordinates:[[121.5,25.0299],[121.5005,25.0299]]}},
    {type:'Feature',properties:{name:'A tree',category:'tree'},
     geometry:{type:'Point',coordinates:[121.5003,25.03015]}}
   ]};
   await page.locator('#source-label').fill('TEST_USER_GEODATA_REFERENCE');
   await page.locator('#file').setInputFiles({
    name:'sample-user-map.geojson',mimeType:'application/geo+json',
    buffer:Buffer.from(JSON.stringify(geo))});
   await page.waitForFunction(()=>JSON.parse(document.getElementById('map-details').textContent).features===3);
   let summary=JSON.parse(await page.locator('#map-details').textContent());
   assert.equal(summary.coordinateMode,'WGS84_APPROX_LOCAL_METERS');
   assert.equal(summary.sourceLabel,'TEST_USER_GEODATA_REFERENCE');
   assert.equal(summary.automaticallyGeolocatedFromPhoto,false);
   await page.locator('#reference').selectOption('geo_1');
   await page.locator('#target').selectOption('geo_2');
   await page.locator('#axis').selectOption('width');
   await page.locator('#compare').click();
   const compare=JSON.parse(await page.locator('#comparison').textContent());
   assert.ok(compare.apparentPercent>20);
   assert.equal(compare.photoPerspectiveCorrectionPerformed,false);
   const dl=page.waitForEvent('download');
   await page.locator('#export').click();
   const output=await dl;const exportMap=JSON.parse((await readFile(await output.path())).toString('utf8'));
   assert.equal(exportMap.originalPhotosOrVideosIncluded,false);
   assert.equal(exportMap.actual3DMeshCreated,false);
   assert.equal(exportMap.map.features.length,3);
   await page.locator('#category').selectOption('tree');
   await page.locator('#feature-name').fill('Another observed tree');
   await page.locator('#map').scrollIntoViewIfNeeded();
   await page.locator('#map').click({position:{x:70,y:50}});
   await page.waitForFunction(()=>JSON.parse(document.getElementById('map-details').textContent).features===4);
   summary=JSON.parse(await page.locator('#map-details').textContent());
   assert.equal(summary.features,4);
   assert.equal(summary.dense3DWorldReconstructed,false);
   assert.deepEqual(errors,[]);
   await page.screenshot({path:folder+'/'+device.name+'-map-source-layers.png'});
   await writeFile(folder+'/'+device.name+'-map-evidence.json',JSON.stringify({
    device:device.name,fixtureOnly:true,
    localGeoJSONActuallyImported:true,features:summary.features,compare,
    relativePhotoScaleNotSolved:true,liveGPSLookup:false,
    anatomical3DModelGenerated:false
   },null,2)+'\n');
   console.log('AIG_FASTMODEL_7_12_SOURCE_MAP_GEOJSON_BROWSER_PASS',device.name,summary.features);
  }catch(e){
   await page.screenshot({path:folder+'/'+device.name+'-FAIL.png'}).catch(()=>{});
   throw Error(device.name+' '+e.message+
    ' status='+await page.locator('#status').textContent().catch(()=>null)+
    ' pageerrors='+JSON.stringify(errors));
  }finally{await page.close();}
 }
}finally{await browser.close();}
