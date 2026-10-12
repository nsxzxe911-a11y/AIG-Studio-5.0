from pathlib import Path
R=Path(__file__).resolve().parents[1]
def need(p,*xs):
 f=R/p
 if not f.is_file():raise SystemExit('MISSING:'+str(p))
 s=f.read_text(encoding='utf-8')
 for x in xs:
  if x not in s:raise SystemExit('MISSING_TOKEN:'+str(p)+':'+x)
 return s
need(Path('settings.gradle.kts'),'AIG-Fifth-434');need(Path('app/build.gradle.kts'),'4340001','434.0.0');m=need(Path('app/src/main/kotlin/com/aig/fifth432/MainActivity.kt'),'MachineGlView','MachineMode.SIM','MachineMode.AXIS6','VERTICAL ONLY','材料移除證據');g=need(Path('renderer-unity-api/src/main/kotlin/com/aig/renderer/unity/api/MachineGlView.kt'),'GLSurfaceView.Renderer','GLES20.glDrawArrays','Matrix.rotateM','drawStock','cutSegment','removedVolumeMm3');need(Path('renderer-unity-api/src/main/kotlin/com/aig/renderer/unity/api/StockRemovalGrid.kt'),'cutSegment','removedVolumeMm3');
for a in ['aig_home.png','aig_cad.png','aig_cam.jpg','aig_sim.jpg','aig_axis3.jpg','aig_axis4.png','aig_axis5.jpg','aig_machine.jpg']:
 p=R/'core-ui/src/main/res/drawable-nodpi'/a
 if not p.is_file() or not p.stat().st_size:raise SystemExit('MISSING_RGB:'+a)
for bad in ['renderer 尚未掛載','engineering shell','horizontal 6ax','fake 3d']:
 if bad in (m+'\n'+g).lower():raise SystemExit('FORBIDDEN:'+bad)
print('AIG_ANDROID_OFFICIAL_434_STATIC_PASS')
